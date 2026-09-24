import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// An HMR reload mid-interaction makes e2e runs flaky, so the e2e server serves without it.
	server: { hmr: !process.env.E2E },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				runtime: 'nodejs22.x',
				// Next to the Turso database (aws-ap-south-1). From the default iad1 every query
				// crossed the globe, and a single tab switch makes several of them in a row.
				regions: ['bom1']
			}),
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					env: {
						DEEPSEEK_API_KEY: 'test-deepseek-key',
						TELEGRAM_BOT_TOKEN: 'test-bot-token',
						DATABASE_URL: ':memory:',
						NODE_ENV: 'test',
						// Pinned empty so a developer's local .env cannot switch the auth bypass on under test.
						DEV_TELEGRAM_ID: ''
					}
				}
			}
		]
	}
});
