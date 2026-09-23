import { defineConfig } from '@playwright/test';

const APP_PORT = 4173;
const MOCK_DEEPSEEK_PORT = 5174;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	globalSetup: './e2e/global-setup.ts',
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
				TELEGRAM_BOT_TOKEN: 'e2e-bot-token',
				DEV_TELEGRAM_ID: '999',
				NODE_ENV: 'development'
			}
		}
	]
});
