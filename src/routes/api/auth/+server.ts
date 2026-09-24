import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateInitData } from '$lib/server/external/telegramAuth';
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '$lib/server/session';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

/** Exchanges the signed initData a document request cannot carry for a cookie that it can. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const authHeader = request.headers.get('authorization');
	const initData = authHeader?.startsWith('tma ') ? authHeader.slice('tma '.length) : null;
	const identity = initData ? validateInitData(initData, config.telegramBotToken) : null;

	if (!identity) {
		logger.warn('rejected sign-in with missing or invalid telegram initData');
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	cookies.set(SESSION_COOKIE_NAME, createSessionCookie(identity, config.telegramBotToken), {
		path: '/',
		httpOnly: true,
		secure: true,
		// The Mini App runs inside a cross-site Telegram iframe on the web, where a stricter policy
		// would drop the cookie on every navigation.
		sameSite: 'none',
		maxAge: SESSION_TTL_SECONDS
	});

	return json({ ok: true });
};
