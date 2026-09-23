import 'dotenv/config';

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const config = {
	deepseekApiKey: required('DEEPSEEK_API_KEY'),
	/** Overridable so tests can point the client at a stub instead of the live API. */
	deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
	telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
	databaseUrl: process.env.DATABASE_URL ?? 'file:./data/app.db',
	databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
	nodeEnv: process.env.NODE_ENV ?? 'development',
	/** Local-only escape hatch: browsing the app outside Telegram, where no initData exists. Ignored in production. */
	devTelegramId: process.env.DEV_TELEGRAM_ID
};
