import { expect, test } from './fixtures';

// The paths build on each other: a profile unlocks generation, and a program is what you log against.
test.describe.configure({ mode: 'serial' });

test.describe('critical paths', () => {
	test('an authorised athlete can complete their profile', async ({ page }) => {
		await page.goto('/profile');

		await expect(page.getByText('Finish your profile')).toBeVisible();

		await page.getByRole('button', { name: 'Lose fat' }).click();
		await page.getByRole('button', { name: 'Beginner' }).click();
		await page.getByRole('textbox').fill('Sensitive left knee');
		await page.getByRole('button', { name: 'Save profile' }).click();

		await expect(page.getByText('Saved')).toBeVisible();

		await page.reload();
		await expect(page.getByText('Profile complete')).toBeVisible();
		await expect(page.getByRole('textbox')).toHaveValue('Sensitive left knee');
	});

	test('the AI trainer generates a program and it is saved', async ({ page }) => {
		await page.goto('/programs');

		const saved = page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/programs') && response.request().method() === 'POST'
		);
		await page.getByRole('button', { name: 'Generate program' }).click();

		const { program } = await (await saved).json();
		expect(program.title).toBe('E2E Fat Loss Plan');

		// The app redirects here itself, but the dev server compiles this route on first visit,
		// which can abort that client-side navigation. A full load waits for the compile instead.
		await page.goto(`/programs/${program.id}`);

		await expect(page.getByRole('heading', { name: 'E2E Fat Loss Plan' })).toBeVisible();
		await expect(page.getByText('Bodyweight Squat')).toBeVisible();
		await expect(page.getByText('Face Pull')).toBeVisible();

		// Two days in the mocked response, mapped to their weekday names.
		await expect(page.getByRole('heading', { name: 'Mon' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Wed' })).toBeVisible();

		await page.goto('/programs');
		await expect(page.getByText('E2E Fat Loss Plan')).toBeVisible();
	});

	test('an exercise the AI introduced is flagged for categorising in the library', async ({
		page
	}) => {
		await page.goto('/exercises?search=face');

		await expect(page.getByText('Face Pull')).toBeVisible();
		await expect(page.getByText('Needs categorising')).toBeVisible();
	});

	test('a completed set is logged and shows up in the workout log', async ({ page }) => {
		await page.goto('/programs');
		await page.getByText('E2E Fat Loss Plan').click();

		await page.getByRole('button', { name: 'Log' }).first().click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('spinbutton').first().fill('4');
		await dialog.getByRole('textbox').fill('10');
		await dialog.getByRole('spinbutton').last().fill('20');
		await dialog.getByRole('button', { name: 'Save' }).click();

		await expect(page.getByText('Done 4 × 10 · 20 kg')).toBeVisible();

		await page.goto('/log');
		await expect(page.getByText('Bodyweight Squat')).toBeVisible();
		await expect(page.getByText('E2E Fat Loss Plan')).toBeVisible();
		await expect(page.getByText('4 × 10 · 20 kg')).toBeVisible();
	});
});
