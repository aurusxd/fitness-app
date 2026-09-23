import type { FullConfig } from '@playwright/test';

/**
 * The dev server answers on its port before it has compiled anything, so the first
 * navigation of a run would otherwise race Vite's SSR compile and dependency optimisation.
 */
const ROUTES = ['/profile', '/programs', '/exercises', '/log', '/trainer'];

export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:4173';

	for (const route of ROUTES) {
		await fetch(new URL(route, baseURL)).catch(() => undefined);
	}
}
