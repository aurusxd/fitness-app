export interface AiChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface AiChatOptions {
	responseFormat?: 'text' | 'json';
}

export interface AiResponse {
	content: string;
}

export interface AiClient {
	chat(messages: AiChatMessage[], options?: AiChatOptions): Promise<AiResponse>;
}

export class DeepseekApiError extends Error {
	constructor(public readonly status: number) {
		super(`DeepSeek API responded with status ${status}`);
		this.name = 'DeepseekApiError';
	}
}

const REQUEST_TIMEOUT_MS = 30_000;

export class DeepseekClient implements AiClient {
	constructor(
		private readonly apiKey: string,
		private readonly baseUrl = 'https://api.deepseek.com'
	) {}

	async chat(messages: AiChatMessage[], options: AiChatOptions = {}): Promise<AiResponse> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: 'deepseek-chat',
					messages,
					...(options.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {})
				}),
				signal: controller.signal
			});

			if (!response.ok) {
				throw new DeepseekApiError(response.status);
			}

			const data = (await response.json()) as {
				choices: { message: { content: string } }[];
			};

			return { content: data.choices[0]?.message.content ?? '' };
		} finally {
			clearTimeout(timeout);
		}
	}
}
