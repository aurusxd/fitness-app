import { expect, test } from './fixtures';

// The paths build on each other: a profile unlocks generation, and a program is what you log against.
test.describe.configure({ mode: 'serial' });

test.describe('critical paths', () => {
	test('an authorised athlete can complete their profile', async ({ page }) => {
		await page.goto('/profile');

		await expect(page.getByText('Заполни профиль')).toBeVisible();

		await page.getByRole('button', { name: 'Похудение' }).click();
		await page.getByRole('button', { name: 'Новичок' }).click();
		await page.getByRole('textbox').fill('Больное левое колено');
		await page.getByRole('button', { name: 'Сохранить профиль' }).click();

		await expect(page.getByText('Сохранено')).toBeVisible();

		await page.reload();
		await expect(page.getByText('Профиль заполнен')).toBeVisible();
		await expect(page.getByRole('textbox')).toHaveValue('Больное левое колено');
	});

	test('the AI trainer generates a program and it is saved', async ({ page }) => {
		await page.goto('/programs');

		const saved = page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/programs') && response.request().method() === 'POST'
		);
		await page.getByRole('button', { name: 'Собрать программу' }).click();

		const { program } = await (await saved).json();
		expect(program.title).toBe('Программа похудения E2E');

		// The app redirects here itself, but the dev server compiles this route on first visit,
		// which can abort that client-side navigation. A full load waits for the compile instead.
		await page.goto(`/programs/${program.id}`);

		await expect(page.getByRole('heading', { name: 'Программа похудения E2E' })).toBeVisible();
		await expect(page.getByText('Приседания без веса')).toBeVisible();
		await expect(page.getByText('Тяга к лицу')).toBeVisible();

		// Two days in the mocked response, mapped to their weekday names.
		await expect(page.getByRole('heading', { name: 'Пн' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Ср' })).toBeVisible();

		await page.goto('/programs');
		await expect(page.getByText('Программа похудения E2E')).toBeVisible();
	});

	test('an exercise the AI introduced is flagged for categorising in the library', async ({
		page
	}) => {
		await page.goto('/exercises?search=лицу');

		await expect(page.getByText('Тяга к лицу')).toBeVisible();
		await expect(page.getByText('Нужна категория')).toBeVisible();
	});

	test('a completed set is logged and shows up in the workout log', async ({ page }) => {
		await page.goto('/programs');
		await page.getByText('Программа похудения E2E').click();

		await page.getByRole('button', { name: 'Отметить' }).first().click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('spinbutton').first().fill('4');
		await dialog.getByRole('textbox').fill('10');
		await dialog.getByRole('spinbutton').last().fill('20');
		await dialog.getByRole('button', { name: 'Сохранить' }).click();

		await expect(page.getByText('Сделано 4 × 10 · 20 кг')).toBeVisible();

		await page.goto('/log');
		await expect(page.getByText('Приседания без веса')).toBeVisible();
		await expect(page.getByText('Программа похудения E2E')).toBeVisible();
		await expect(page.getByText('4 × 10 · 20 кг')).toBeVisible();
	});

	test('the coach composer stays above the tab bar, and replies arrive in view', async ({
		page
	}) => {
		await page.goto('/trainer');

		const composer = page.getByPlaceholder('Спроси тренера…');
		const tabBar = page.getByRole('navigation');

		// Being inside the viewport is not enough: the tab bar floats over the page, and a composer
		// underneath it can only be reached by scrolling.
		const composerBox = await composer.boundingBox();
		const tabBarBox = await tabBar.boundingBox();
		expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(tabBarBox!.y);

		await composer.fill('How should I train today?');
		await page.getByRole('button', { name: '→' }).click();

		const reply = page.getByText('Хорошо, сегодня начнём спокойно.');
		await expect(reply).toBeVisible();
		const replyBox = await reply.boundingBox();
		expect(replyBox!.y + replyBox!.height).toBeLessThanOrEqual(composerBox!.y);
	});
});
