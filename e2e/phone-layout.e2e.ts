import { expect, test } from './fixtures';

// Telegram opens the Mini App at phone width, and the Russian labels are the longest ones the
// layout has to carry, so this is where a row that cannot wrap starts pushing the page sideways.
test.use({ viewport: { width: 375, height: 812 } });

const SCREENS = ['/home', '/exercises', '/log', '/programs', '/profile', '/trainer'];

test.describe('phone layout', () => {
	for (const screen of SCREENS) {
		test(`${screen} never scrolls sideways`, async ({ page }) => {
			await page.goto(screen);

			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth
			}));

			expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
		});
	}
});
