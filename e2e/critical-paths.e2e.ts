import type { Page } from '@playwright/test';
import { anonymousTest, expect, test } from './fixtures';
import { initDataFor, installTelegramStub, signIn } from './telegram';

/** A fresh athlete with a profile, one program and one set logged today against it. */
async function athleteWithALoggedSet(page: Page, id: number): Promise<void> {
	await installTelegramStub(page, initDataFor({ id, username: `athlete${id}` }));
	await signIn(page);

	await page.goto('/profile');
	const goal = page.getByRole('button', { name: 'Похудение' });
	await goal.click();
	await expect(goal).toHaveClass(/bg-primary/);
	await page.getByRole('button', { name: 'Новичок' }).click();
	await page.getByRole('button', { name: 'Сохранить профиль' }).click();
	await expect(page.getByText('Сохранено')).toBeVisible();

	// A click before hydration lands on server-rendered HTML with no handler behind it.
	await page.goto('/programs', { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Собрать программу' }).click();
	await expect(page).toHaveURL(/\/programs\/\d+$/);

	await page.getByRole('button', { name: 'Отметить' }).first().click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('spinbutton').first().fill('3');
	await dialog.getByRole('textbox').fill('12');
	await dialog.getByRole('button', { name: 'Сохранить' }).click();
	await expect(page.getByText('Сделано 3 × 12')).toBeVisible();
}

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
		await page.getByRole('button', { name: 'Отправить' }).click();

		const reply = page.getByText('Хорошо, сегодня начнём спокойно.');
		await expect(reply).toBeVisible();
		const replyBox = await reply.boundingBox();
		expect(replyBox!.y + replyBox!.height).toBeLessThanOrEqual(composerBox!.y);
	});

	anonymousTest(
		'a new athlete builds their first program straight from the home screen',
		async ({ page }) => {
			// A fresh athlete: the shared one already has programs, so its home shows none of this.
			await installTelegramStub(page, initDataFor({ id: 888, username: 'newcomer' }));
			await signIn(page);

			// Without a goal and level there is nothing to build from, so home sends them to the profile.
			await page.getByRole('link', { name: 'Заполнить профиль' }).click();
			await expect(page).toHaveURL(/\/profile$/);

			const goal = page.getByRole('button', { name: 'Похудение' });
			await goal.click();
			await expect(goal).toHaveClass(/bg-primary/);
			await page.getByRole('button', { name: 'Новичок' }).click();
			await page.getByRole('button', { name: 'Сохранить профиль' }).click();
			await expect(page.getByText('Сохранено')).toBeVisible();

			await page.goto('/home');
			await page.getByRole('button', { name: 'Собрать программу' }).click();

			await expect(page).toHaveURL(/\/programs\/\d+$/);
			await expect(page.getByRole('heading', { name: 'Программа похудения E2E' })).toBeVisible();
		}
	);

	test('the program is built from what the athlete told the coach', async ({ page, request }) => {
		await page.goto('/trainer');

		await page.getByPlaceholder('Спроси тренера…').fill('Тренируюсь дома, есть только гантели');
		await page.getByRole('button', { name: 'Отправить' }).click();
		await expect(page.getByText('Хорошо, сегодня начнём спокойно.').last()).toBeVisible();

		await page.getByRole('button', { name: 'Собрать программу' }).click();
		await expect(page).toHaveURL(/\/programs\/\d+$/);

		// The only way to know the conversation shaped the program is to look at what reached the model.
		const sent = await (await request.get('http://localhost:5174/__last-program-request')).json();
		const contents = sent.messages.map((message: { content: string }) => message.content);
		expect(contents).toContain('Тренируюсь дома, есть только гантели');
		expect(contents.at(-1)).toContain('Goal: lose');
	});

	test('the coach shows it is working on a reply until the reply lands', async ({ page }) => {
		// A slow answer, so the in-between state is long enough to see.
		await page.route('**/api/trainer', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 800));
			await route.continue();
		});
		await page.goto('/trainer');

		await page.getByPlaceholder('Спроси тренера…').fill('Сколько отдыхать между подходами?');
		await page.getByRole('button', { name: 'Отправить' }).click();

		await expect(page.getByRole('status')).toHaveText('Думаю над ответом…');
		await expect(page.locator('.coach-orbit')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Отправить' })).toBeDisabled();

		await expect(page.getByRole('status')).toHaveCount(0);
		await expect(page.locator('.coach-orbit')).toHaveCount(0);
	});

	test('a tapped tab lights up before its screen has loaded', async ({ page }) => {
		await page.goto('/home');
		await page.route('**/log/__data.json*', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			await route.continue();
		});

		const logTab = page.getByRole('link', { name: 'Журнал' });
		await logTab.click();

		// Still on the old screen, but the tap is already acknowledged.
		await expect(logTab).toHaveAttribute('aria-current', 'page');
		expect(new URL(page.url()).pathname).toBe('/home');

		await expect(page).toHaveURL(/\/log$/);
	});

	anonymousTest(
		'deleting a program hides it but keeps what was logged against it',
		async ({ page }) => {
			await athleteWithALoggedSet(page, 901);

			await page.goto('/programs', { waitUntil: 'networkidle' });
			await page.getByRole('button', { name: 'Удалить «Программа похудения E2E»' }).click();

			const dialog = page.getByRole('dialog');
			await expect(dialog).toContainText('останутся в журнале');
			await dialog.getByRole('button', { name: 'Удалить' }).click();

			await expect(page.getByText('Программ пока нет')).toBeVisible();
			await page.reload();
			await expect(page.getByText('Программ пока нет')).toBeVisible();

			// The history belongs to the athlete, not to the program.
			await page.goto('/log');
			await expect(page.getByText('3 × 12')).toBeVisible();
			await expect(page.getByText('Программа похудения E2E')).toBeVisible();
		}
	);
});
