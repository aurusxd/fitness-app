import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig() {
	vi.resetModules();
	return (await import('./config')).config;
}

describe('config', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('falls back to the DeepSeek production API when no base url is configured', async () => {
		vi.stubEnv('DEEPSEEK_BASE_URL', undefined);

		expect((await loadConfig()).deepseekBaseUrl).toBe('https://api.deepseek.com');
	});

	it('treats an empty base url as unset, so a blank dashboard row cannot break every request', async () => {
		vi.stubEnv('DEEPSEEK_BASE_URL', '');

		expect((await loadConfig()).deepseekBaseUrl).toBe('https://api.deepseek.com');
	});

	it('trims a secret pasted with surrounding whitespace', async () => {
		vi.stubEnv('DEEPSEEK_API_KEY', '  sk-pasted-with-a-newline\n');

		expect((await loadConfig()).deepseekApiKey).toBe('sk-pasted-with-a-newline');
	});

	it('keeps a configured base url, which is how e2e points at its stub', async () => {
		vi.stubEnv('DEEPSEEK_BASE_URL', 'http://localhost:5174');

		expect((await loadConfig()).deepseekBaseUrl).toBe('http://localhost:5174');
	});

	it('refuses to start without a bot token rather than failing later per request', async () => {
		vi.stubEnv('TELEGRAM_BOT_TOKEN', '   ');

		await expect(loadConfig()).rejects.toThrow('TELEGRAM_BOT_TOKEN');
	});
});
