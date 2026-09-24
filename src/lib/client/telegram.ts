interface TelegramWebApp {
	/** Signed payload Telegram injects; an empty string when the page is open outside Telegram. */
	initData: string;
	ready: () => void;
	expand: () => void;
}

declare global {
	interface Window {
		Telegram?: { WebApp?: TelegramWebApp };
	}
}

export function getTelegramInitData(): string | null {
	return window.Telegram?.WebApp?.initData || null;
}

export function isInsideTelegram(): boolean {
	return getTelegramInitData() !== null;
}

/**
 * Tells Telegram the Mini App has painted and asks for the full viewport.
 * Safe to call outside Telegram, where the SDK is absent.
 */
export function initTelegramWebApp(): void {
	const webApp = window.Telegram?.WebApp;
	webApp?.ready();
	webApp?.expand();
}

/** Wraps `fetch`, attaching the Telegram `initData` signature required by protected API routes. */
export function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
	const initData = getTelegramInitData();
	const headers = new Headers(init.headers);
	if (initData) {
		headers.set('Authorization', `tma ${initData}`);
	}
	return fetch(input, { ...init, headers });
}

/**
 * Exchanges the Telegram signature for a session cookie, the only credential a document request
 * (opening the app, switching tabs, an SSR `load`) can carry. Resolves false outside Telegram.
 */
export async function signIn(): Promise<boolean> {
	const initData = getTelegramInitData();
	if (!initData) return false;

	const response = await fetch('/api/auth', {
		method: 'POST',
		headers: { Authorization: `tma ${initData}` }
	});

	return response.ok;
}
