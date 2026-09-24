import { describe, expect, it } from 'vitest';
import { createSessionCookie, readSessionCookie, SESSION_TTL_SECONDS } from './session';

const BOT_TOKEN = '123456:test-bot-token';
const IDENTITY = { telegramId: '42', username: 'olivia' };

describe('session cookie', () => {
	it('reads back the identity it was created for', () => {
		const cookie = createSessionCookie(IDENTITY, BOT_TOKEN);

		expect(readSessionCookie(cookie, BOT_TOKEN)).toEqual(IDENTITY);
	});

	it('keeps an identity without a username', () => {
		const cookie = createSessionCookie({ telegramId: '42', username: null }, BOT_TOKEN);

		expect(readSessionCookie(cookie, BOT_TOKEN)).toEqual({ telegramId: '42', username: null });
	});

	it('rejects a cookie signed with a different bot token', () => {
		const cookie = createSessionCookie(IDENTITY, 'other-bot-token');

		expect(readSessionCookie(cookie, BOT_TOKEN)).toBeNull();
	});

	it('rejects a cookie whose payload was swapped for another user', () => {
		const [, expiresAt, signature] = createSessionCookie(IDENTITY, BOT_TOKEN).split('.');
		const forged = Buffer.from(JSON.stringify({ telegramId: '99', username: 'mallory' })).toString(
			'base64url'
		);

		expect(readSessionCookie(`${forged}.${expiresAt}.${signature}`, BOT_TOKEN)).toBeNull();
	});

	it('rejects a cookie past its lifetime', () => {
		const issuedAt = Date.now();
		const cookie = createSessionCookie(IDENTITY, BOT_TOKEN, issuedAt);

		expect(
			readSessionCookie(cookie, BOT_TOKEN, issuedAt + SESSION_TTL_SECONDS * 1000 + 1)
		).toBeNull();
	});

	it('rejects a value that is not a session cookie at all', () => {
		expect(readSessionCookie('not-a-cookie', BOT_TOKEN)).toBeNull();
	});
});
