import type { FullConfig } from '@playwright/test';

/**
 * The dev server answers on its port before it has compiled anything, so the first
 * navigation of a run would otherwise race Vite's SSR compile and dependency optimisation.
 * Each route is polled until it actually renders, not merely requested.
 */
const ROUTES = ['/profile', '/programs', '/exercises', '/log', '/trainer'];
const ATTEMPTS = 30;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function warmUp(url: URL): Promise<void> {
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
			throw new Error(`responded ${response.status}`);
		} catch (cause) {
			if (attempt === ATTEMPTS) {
				throw new Error(`${url.pathname} never became ready`, { cause });
			}
			await sleep(RETRY_DELAY_MS);
		}
	}
}

export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4173';

	for (const route of ROUTES) {
		await warmUp(new URL(route, baseURL));
	}
}
