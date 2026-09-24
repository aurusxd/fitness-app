import { test as base } from '@playwright/test';
import { installTelegramStub, signIn } from './telegram';

/**
 * The app loads the Telegram SDK from telegram.org, but the suite must not depend on that
 * host being reachable: it would slow every page load and make runs fail for network reasons.
 */
const offline = base.extend({
	page: async ({ page }, use) => {
		await page.route('https://telegram.org/**', (route) => route.abort());
		await use(page);
	}
});

/** No Telegram, no session — what someone opening the deployed URL in a plain browser gets. */
export const anonymousTest = offline;

/**
 * Signs in exactly the way production does — stubbed SDK, bootstrap at `/`, session cookie —
 * rather than through `DEV_TELEGRAM_ID`, which would hide whether that path works at all.
 */
export const test = offline.extend({
	page: async ({ page }, use) => {
		await installTelegramStub(page);
		await signIn(page);
		await use(page);
	}
});

export { expect } from '@playwright/test';
