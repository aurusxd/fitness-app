import type { Handle } from '@sveltejs/kit';
import { validateInitData } from '$lib/server/external/telegramAuth';
import { UserRepository } from '$lib/server/repositories/userRepository';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

function isProtectedRoute(routeId: string | null, pathname: string): boolean {
	return pathname.startsWith('/api/') || (routeId?.startsWith('/(app)') ?? false);
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!isProtectedRoute(event.route.id, event.url.pathname)) {
		return resolve(event);
	}

	const authHeader = event.request.headers.get('authorization');
	const initData = authHeader?.startsWith('tma ') ? authHeader.slice('tma '.length) : null;

	if (!initData) {
		return new Response('Unauthorized', { status: 401 });
	}

	const parsed = validateInitData(initData, config.telegramBotToken);
	if (!parsed) {
		logger.warn('rejected request with invalid telegram initData signature');
		return new Response('Unauthorized', { status: 401 });
	}

	const userRepository = new UserRepository();
	event.locals.user = await userRepository.findOrCreateByTelegram(
		parsed.telegramId,
		parsed.username
	);

	return resolve(event);
};
