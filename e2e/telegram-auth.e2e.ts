import { anonymousTest, expect, test } from './fixtures';
import { INIT_DATA } from './telegram';

test.describe('telegram integration', () => {
	test('opening the app signs the athlete in and lands them in the app shell', async ({ page }) => {
		// The fixture already ran the bootstrap; this asserts where it left the athlete.
		await expect(page).toHaveURL(/\/home$/);
		await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
	});

	test('keeps the session across a full page load, which carries no Authorization header', async ({
		page
	}) => {
		await page.goto('/profile');

		await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible();
	});

	test('sends the signed initData from the Telegram SDK as an Authorization header', async ({
		page
	}) => {
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

	anonymousTest(
		'turns away a visitor with no Telegram session instead of serving the app',
		async ({ page }) => {
			const response = await page.goto('/profile');

			expect(response?.status()).toBe(401);
			await expect(page.getByText('Open this app from your Telegram bot')).toBeVisible();
		}
	);

	anonymousTest('refuses to hand out a session without a signature', async ({ request }) => {
		const response = await request.post('/api/auth');

		expect(response.status()).toBe(401);
	});
});
