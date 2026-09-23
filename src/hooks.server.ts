import { error, json, type Handle } from '@sveltejs/kit';
import { validateInitData, type TelegramInitData } from '$lib/server/external/telegramAuth';
import { UserRepository } from '$lib/server/repositories/userRepository';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

function isProtectedRoute(routeId: string | null, pathname: string): boolean {
	return pathname.startsWith('/api/') || (routeId?.startsWith('/(app)') ?? false);
}

/** Outside Telegram there is no initData, so local development falls back to a fixed identity. Never active in production. */
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

		identity = devIdentity();
		if (!identity) {
			// An API caller wants a machine-readable answer; a person in a browser wants to know why.
			if (event.url.pathname.startsWith('/api/')) {
				return json({ error: 'Unauthorized' }, { status: 401 });
			}
			error(401, 'Open this app from your Telegram bot to sign in.');
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
