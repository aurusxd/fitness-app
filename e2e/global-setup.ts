import { chromium, type FullConfig } from '@playwright/test';

/**
 * The dev server answers on its port long before it has compiled anything, and it compiles the
 * SSR and the client module graphs separately. Warming with `fetch` would only cover the server
 * half, so a real browser visits each route and the first test no longer races Vite.
 */
const ROUTES = ['/home', '/profile', '/programs', '/exercises', '/log', '/trainer'];
const ATTEMPTS = 20;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4173';
	const browser = await chromium.launch();

	try {
		const page = await browser.newPage({ baseURL });
		// The suite never depends on telegram.org being reachable.
		await page.route('https://telegram.org/**', (route) => route.abort());

		for (const route of ROUTES) {
			let lastError: unknown;

			for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
				try {
					const response = await page.goto(route, { waitUntil: 'networkidle' });
					if (response?.ok()) {
						lastError = undefined;
						break;
					}
					lastError = new Error(`responded ${response?.status()}`);
				} catch (cause) {
					lastError = cause;
				}
				await sleep(RETRY_DELAY_MS);
			}

			if (lastError) {
				throw new Error(`${route} never became ready`, { cause: lastError });
			}
		}
	} finally {
		await browser.close();
	}
}
