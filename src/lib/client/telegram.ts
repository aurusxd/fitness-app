interface TelegramWebApp {
	initData: string;
}

declare global {
	interface Window {
		Telegram?: { WebApp?: TelegramWebApp };
	}
}

export function getTelegramInitData(): string | null {
	return window.Telegram?.WebApp?.initData || null;
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
