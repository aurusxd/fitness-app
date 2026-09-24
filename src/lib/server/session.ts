import { createHmac, timingSafeEqual } from 'node:crypto';

/** Documents and `__data.json` requests carry cookies, unlike the `Authorization` header. */
export const SESSION_COOKIE_NAME = 'session';

export const SESSION_TTL_SECONDS = 24 * 60 * 60;

export interface SessionIdentity {
	telegramId: string;
	username: string | null;
}

/** Derived from the bot token, and deliberately not the key that validates initData. */
function signingKey(botToken: string): Buffer {
	return createHmac('sha256', 'TelegramMiniAppSession').update(botToken).digest();
}

function sign(data: string, botToken: string): string {
	return createHmac('sha256', signingKey(botToken)).update(data).digest('hex');
}

export function createSessionCookie(
	identity: SessionIdentity,
	botToken: string,
	now: number = Date.now()
): string {
	const payload = Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url');
	const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
	const signed = `${payload}.${expiresAt}`;

	return `${signed}.${sign(signed, botToken)}`;
}

export function readSessionCookie(
	cookie: string,
	botToken: string,
	now: number = Date.now()
): SessionIdentity | null {
	const [payload, expiresAt, signature] = cookie.split('.');
	if (!payload || !expiresAt || !signature) return null;

	const expected = Buffer.from(sign(`${payload}.${expiresAt}`, botToken), 'hex');
	const received = Buffer.from(signature, 'hex');
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
		return null;
	}

	if (!(Number(expiresAt) > now / 1000)) return null;

	let identity: SessionIdentity;
	try {
		identity = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionIdentity;
	} catch {
		return null;
	}

	if (typeof identity?.telegramId !== 'string' || !identity.telegramId) return null;

	return { telegramId: identity.telegramId, username: identity.username ?? null };
}
