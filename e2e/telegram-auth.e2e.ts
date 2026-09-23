import { createHmac } from 'node:crypto';
import { expect, test } from './fixtures';

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

const INIT_DATA = signInitData({
	auth_date: '1700000000',
	user: JSON.stringify({ id: 777, username: 'tg_user' })
});

test.describe('telegram integration', () => {
	test('sends the signed initData from the Telegram SDK as an Authorization header', async ({
		page
	}) => {
		await page.addInitScript((initData) => {
			window.Telegram = {
				WebApp: { initData, ready: () => {}, expand: () => {} }
			};
		}, INIT_DATA);

		await page.goto('/profile');

		// Selecting only takes effect once the page is interactive, so confirm it before saving.
		const goal = page.getByRole('button', { name: 'Lose fat' });
		await goal.click();
		await expect(goal).toHaveClass(/bg-primary/);

		await page.getByRole('button', { name: 'Beginner' }).click();

		const request = page.waitForRequest(
			(candidate) => candidate.url().endsWith('/api/profile') && candidate.method() === 'PATCH'
		);

		await page.getByRole('button', { name: 'Save profile' }).click();

		expect((await request).headers()['authorization']).toBe(`tma ${INIT_DATA}`);
		await expect(page.getByText('Saved')).toBeVisible();
	});

	test('loads the Telegram SDK, which is what defines window.Telegram', async ({ page }) => {
		await page.goto('/profile');

		const sources = await page
			.locator('head script[src]')
			.evaluateAll((scripts) => scripts.map((script) => script.getAttribute('src')));

		expect(sources).toContain('https://telegram.org/js/telegram-web-app.js');
	});
});
