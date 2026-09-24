import { defineConfig } from '@playwright/test';

const APP_PORT = 4173;
const MOCK_DEEPSEEK_PORT = 5174;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	globalSetup: './e2e/global-setup.ts',
	// One database is shared by the whole run, so parallel workers would fight over it.
	workers: 1,
	use: { baseURL: `http://localhost:${APP_PORT}` },
	webServer: [
		{
			command: 'node e2e/mock-deepseek.mjs',
			port: MOCK_DEEPSEEK_PORT,
			reuseExistingServer: false
		},
		{
			// A disposable database per run, so logged sets and generated programs never leak between runs.
			command: `npm run db:reset:e2e && npm run db:migrate:apply && npm run db:seed && npm run dev -- --port ${APP_PORT} --strictPort`,
			port: APP_PORT,
			reuseExistingServer: false,
			env: {
				E2E: 'true',
				DATABASE_URL: 'file:./data/e2e.db',
				DEEPSEEK_API_KEY: 'e2e-key',
				DEEPSEEK_BASE_URL: `http://localhost:${MOCK_DEEPSEEK_PORT}`,
				// Pinned empty so a developer's local .env cannot switch the auth bypass on: the suite
				// signs in the way production does, through initData.
				DEV_TELEGRAM_ID: '',
				TELEGRAM_BOT_TOKEN: 'e2e-bot-token',
				NODE_ENV: 'development'
			}
		}
	]
});
