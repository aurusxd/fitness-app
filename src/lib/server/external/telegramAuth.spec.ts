import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateInitData } from './telegramAuth';

const BOT_TOKEN = '123456:test-bot-token';

function signInitData(params: Record<string, string>, botToken: string): string {
	const dataCheckString = Object.entries(params)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
	const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

	return new URLSearchParams({ ...params, hash }).toString();
}

describe('validateInitData', () => {
	it('extracts telegramId and username from a correctly signed initData', () => {
		const initData = signInitData(
			{ auth_date: '1700000000', user: JSON.stringify({ id: 42, username: 'olivia' }) },
			BOT_TOKEN
		);

		const result = validateInitData(initData, BOT_TOKEN);

		expect(result).toEqual({ telegramId: '42', username: 'olivia' });
	});

	it('rejects initData signed with a different bot token', () => {
		const initData = signInitData(
			{ auth_date: '1700000000', user: JSON.stringify({ id: 42, username: 'olivia' }) },
			'other-bot-token'
		);

		expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
	});

	it('rejects tampered initData whose payload no longer matches the hash', () => {
		const initData = signInitData(
			{ auth_date: '1700000000', user: JSON.stringify({ id: 42, username: 'olivia' }) },
			BOT_TOKEN
		);
		const tampered = initData.replace('id%22%3A42', 'id%22%3A99');

		expect(validateInitData(tampered, BOT_TOKEN)).toBeNull();
	});

	it('rejects initData missing the hash field', () => {
		const initData = new URLSearchParams({ auth_date: '1700000000' }).toString();

		expect(validateInitData(initData, BOT_TOKEN)).toBeNull();
	});
});
