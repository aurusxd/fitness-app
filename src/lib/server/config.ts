import 'dotenv/config';

/**
 * A variable set to an empty value counts as unset, and surrounding whitespace is dropped: hosting
 * dashboards keep empty rows, and a key pasted with a trailing newline would otherwise be sent
 * verbatim in an Authorization header and rejected upstream.
 */
function optional(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

function required(name: string): string {
	const value = optional(name);
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const config = {
	deepseekApiKey: required('DEEPSEEK_API_KEY'),
	/** Overridable so tests can point the client at a stub instead of the live API. */
	deepseekBaseUrl: optional('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com',
	telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
	databaseUrl: optional('DATABASE_URL') ?? 'file:./data/app.db',
	databaseAuthToken: optional('DATABASE_AUTH_TOKEN'),
	nodeEnv: optional('NODE_ENV') ?? 'development',
	/** Local-only escape hatch: browsing the app outside Telegram, where no initData exists. Ignored in production. */
	devTelegramId: optional('DEV_TELEGRAM_ID')
};
