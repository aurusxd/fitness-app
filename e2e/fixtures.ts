import { test as base } from '@playwright/test';

/**
 * The app loads the Telegram SDK from telegram.org, but the suite must not depend on that
 * host being reachable: it would slow every page load and make runs fail for network reasons.
 * Tests that need the SDK stub it themselves via `addInitScript`.
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route('https://telegram.org/**', (route) => route.abort());
		await use(page);
	}
});

export { expect } from '@playwright/test';
