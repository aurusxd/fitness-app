import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramInitData {
	telegramId: string;
	username: string | null;
}

interface TelegramInitDataUser {
	id: number;
	username?: string;
}

/**
 * Validates Telegram Mini App `initData` per the official signature scheme:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): TelegramInitData | null {
	const params = new URLSearchParams(initData);
	const hash = params.get('hash');
	if (!hash) return null;
	params.delete('hash');

	const dataCheckString = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
	const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

	const hashBuffer = Buffer.from(hash, 'hex');
	const computedBuffer = Buffer.from(computedHash, 'hex');
	if (hashBuffer.length !== computedBuffer.length || !timingSafeEqual(hashBuffer, computedBuffer)) {
		return null;
	}

	const userField = params.get('user');
	if (!userField) return null;

	let user: TelegramInitDataUser;
	try {
		user = JSON.parse(userField) as TelegramInitDataUser;
	} catch {
		return null;
	}

	return {
		telegramId: String(user.id),
		username: user.username ?? null
	};
}
