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
	telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
	databaseUrl: process.env.DATABASE_URL ?? 'file:./data/app.db',
	databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
	nodeEnv: process.env.NODE_ENV ?? 'development'
};
