import { createHmac } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { User } from '$lib/server/domain/user';

const BOT_TOKEN = 'test-bot-token';

function signInitData(params: Record<string, string>): string {
	const dataCheckString = Object.entries(params)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
	const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

	return new URLSearchParams({ ...params, hash }).toString();
}

const fakeUser = new User({
	id: 1,
	telegramId: '42',
	username: 'olivia',
	goal: null,
	level: null,
	constraints: null,
	createdAt: new Date()
});

const findOrCreateByTelegram = vi.fn().mockReturnValue(fakeUser);

vi.mock('$lib/server/repositories/userRepository', () => ({
	UserRepository: vi.fn().mockImplementation(function UserRepository() {
		return { findOrCreateByTelegram };
	})
}));

function makeEvent(routeId: string, pathname: string, authHeader: string | null): RequestEvent {
	return {
		route: { id: routeId },
		url: new URL(`https://example.com${pathname}`),
		request: new Request(`https://example.com${pathname}`, {
			headers: authHeader ? { authorization: authHeader } : undefined
		}),
		locals: {}
	} as unknown as RequestEvent;
}

describe('hooks.server handle', () => {
	it('lets public routes through without auth', async () => {
		const { handle } = await import('./hooks.server');
		const resolve = vi.fn().mockResolvedValue(new Response('ok'));

		const response = await handle({ event: makeEvent('/', '/', null), resolve });

		expect(resolve).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
	});

	it('sends an unauthenticated visitor a readable page explaining how to sign in', async () => {
		const { handle } = await import('./hooks.server');
		const resolve = vi.fn();

		await expect(
			handle({ event: makeEvent('/(app)/trainer', '/trainer', null), resolve })
		).rejects.toMatchObject({
			status: 401,
			body: { message: expect.stringContaining('Telegram') }
		});
		expect(resolve).not.toHaveBeenCalled();
	});

	it('answers an unauthenticated API call with JSON rather than a page', async () => {
		const { handle } = await import('./hooks.server');
		const resolve = vi.fn();

		const response = await handle({
			event: makeEvent('/api/trainer', '/api/trainer', null),
			resolve
		});

		expect(response.status).toBe(401);
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(resolve).not.toHaveBeenCalled();
	});

	it('rejects protected routes with an invalid initData signature', async () => {
		const { handle } = await import('./hooks.server');
		const resolve = vi.fn();
		const tampered = signInitData({ user: JSON.stringify({ id: 42 }) }).replace('42', '99');

		const response = await handle({
			event: makeEvent('/api/trainer', '/api/trainer', `tma ${tampered}`),
			resolve
		});

		expect(response.status).toBe(401);
		expect(resolve).not.toHaveBeenCalled();
	});

	it('grants access and attaches the resolved telegramId for a valid signature', async () => {
		const { handle } = await import('./hooks.server');
		const resolve = vi.fn().mockResolvedValue(new Response('ok'));
		const initData = signInitData({ user: JSON.stringify({ id: 42, username: 'olivia' }) });
		const event = makeEvent('/(app)/trainer', '/trainer', `tma ${initData}`);

		const response = await handle({ event, resolve });

		expect(response.status).toBe(200);
		expect(findOrCreateByTelegram).toHaveBeenCalledWith('42', 'olivia');
		expect(event.locals.user.telegramId).toBe('42');
	});

	describe('DEV_TELEGRAM_ID fallback', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
			vi.resetModules();
		});

		it('grants access without initData when DEV_TELEGRAM_ID is set outside production', async () => {
			vi.stubEnv('DEV_TELEGRAM_ID', '7');
			vi.resetModules();
			const { handle } = await import('./hooks.server');
			const resolve = vi.fn().mockResolvedValue(new Response('ok'));

			const response = await handle({
				event: makeEvent('/(app)/trainer', '/trainer', null),
				resolve
			});

			expect(response.status).toBe(200);
			expect(findOrCreateByTelegram).toHaveBeenCalledWith('7', 'dev');
		});

		it('keeps rejecting requests in production even when DEV_TELEGRAM_ID is set', async () => {
			vi.stubEnv('DEV_TELEGRAM_ID', '7');
			vi.stubEnv('NODE_ENV', 'production');
			vi.resetModules();
			const { handle } = await import('./hooks.server');
			const resolve = vi.fn();

			await expect(
				handle({ event: makeEvent('/(app)/trainer', '/trainer', null), resolve })
			).rejects.toMatchObject({ status: 401 });
			expect(resolve).not.toHaveBeenCalled();
		});
	});
});
