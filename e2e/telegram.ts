import { createHmac } from 'node:crypto';
import type { Page } from '@playwright/test';

const BOT_TOKEN = 'e2e-bot-token';

function signInitData(params: Record<string, string>): string {
	const dataCheckString = Object.entries(params)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
	const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

	return new URLSearchParams({ ...params, hash }).toString();
}

/** Signed per run: the server rejects a signature older than a day. */
export const INIT_DATA = signInitData({
	auth_date: String(Math.floor(Date.now() / 1000)),
	user: JSON.stringify({ id: 777, username: 'tg_user' })
});

/** Stands in for the Telegram client, the only thing that defines `window.Telegram`. */
export async function installTelegramStub(page: Page): Promise<void> {
	await page.addInitScript((initData) => {
		window.Telegram = { WebApp: { initData, ready: () => {}, expand: () => {} } };
	}, INIT_DATA);
}

/** Runs the same bootstrap a real Mini App does: initData in, session cookie out. */
export async function signIn(page: Page): Promise<void> {
	await page.goto('/');
	await page.waitForURL(/\/home$/);
}
