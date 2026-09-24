import { error, json, type Handle } from '@sveltejs/kit';
import { validateInitData, type TelegramInitData } from '$lib/server/external/telegramAuth';
import { readSessionCookie, SESSION_COOKIE_NAME } from '$lib/server/session';
import { UserRepository } from '$lib/server/repositories/userRepository';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

/** Where the signed initData is exchanged for a session cookie, so it cannot require one. */
const SIGN_IN_ROUTE = '/api/auth';

function isProtectedRoute(routeId: string | null, pathname: string): boolean {
	if (pathname === SIGN_IN_ROUTE) return false;
	return pathname.startsWith('/api/') || (routeId?.startsWith('/(app)') ?? false);
}

/** Outside Telegram there is no initData, so local development falls back to a fixed identity. */
function devIdentity(): TelegramInitData | null {
	if (config.nodeEnv === 'production' || !config.devTelegramId) return null;
	return { telegramId: config.devTelegramId, username: 'dev' };
}

export const handle: Handle = async ({ event, resolve }) => {
	if (!isProtectedRoute(event.route.id, event.url.pathname)) {
		return resolve(event);
	}

	const authHeader = event.request.headers.get('authorization');
	const initData = authHeader?.startsWith('tma ') ? authHeader.slice('tma '.length) : null;

	let identity = initData ? validateInitData(initData, config.telegramBotToken) : null;

	if (!identity) {
		if (initData) {
			logger.warn('rejected request with invalid telegram initData signature');
		}

		// Documents, `__data.json` loads and tab navigations cannot carry the header at all.
		const sessionCookie = event.cookies.get(SESSION_COOKIE_NAME);
		identity = sessionCookie ? readSessionCookie(sessionCookie, config.telegramBotToken) : null;
	}

	if (!identity) {
		identity = devIdentity();
		if (!identity) {
			// An API caller wants a machine-readable answer; a person in a browser wants to know why.
			if (event.url.pathname.startsWith('/api/')) {
				return json({ error: 'Unauthorized' }, { status: 401 });
			}
			error(401, 'Открой приложение через своего Telegram-бота, чтобы войти.');
		}
		logger.warn('telegram auth bypassed via DEV_TELEGRAM_ID');
	}

	const userRepository = new UserRepository();
	event.locals.user = await userRepository.findOrCreateByTelegram(
		identity.telegramId,
		identity.username
	);

	return resolve(event);
};
