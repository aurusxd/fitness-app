import type { ChatMessageDto } from '$lib/types';
import { ChatMessageRepository, toChatMessageDto } from '../repositories/chatMessageRepository';
import { DeepseekApiError, type AiChatMessage, type AiClient } from '../external/deepseekClient';
import { logger } from '../logger';

const HISTORY_LIMIT = 20;
const RATE_LIMIT_PER_HOUR = 30;
const RETRY_DELAY_MS = 1000;

export class RateLimitExceededError extends Error {
	constructor() {
		super('Too many messages this hour. Please wait before sending another one.');
		this.name = 'RateLimitExceededError';
	}
}

export class AiTrainerError extends Error {
	constructor(message = 'The AI trainer is unavailable right now. Please try again.') {
		super(message);
		this.name = 'AiTrainerError';
	}
}

function isRetryable(error: unknown): boolean {
	if (error instanceof DeepseekApiError) return error.status >= 500;
	return error instanceof Error && error.name === 'AbortError';
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AiTrainerService {
	constructor(
		private readonly aiClient: AiClient,
		private readonly chatMessageRepository: ChatMessageRepository = new ChatMessageRepository()
	) {}

	async history(userId: number, limit = HISTORY_LIMIT): Promise<ChatMessageDto[]> {
		const rows = await this.chatMessageRepository.recentHistory(userId, limit);
		return rows.map(toChatMessageDto);
	}

	async sendMessage(userId: number, content: string): Promise<ChatMessageDto> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const sentThisHour = await this.chatMessageRepository.countUserMessagesSince(
			userId,
			oneHourAgo
		);
		if (sentThisHour >= RATE_LIMIT_PER_HOUR) {
			throw new RateLimitExceededError();
		}

		await this.chatMessageRepository.append(userId, 'user', content);

		const history = await this.chatMessageRepository.recentHistory(userId, HISTORY_LIMIT);
		const messages: AiChatMessage[] = history.map((row) => ({
			role: row.role,
			content: row.content
		}));

		const reply = await this.requestReplyWithRetry(messages);

		const assistantRow = await this.chatMessageRepository.append(
			userId,
			'assistant',
			reply.content
		);
		return toChatMessageDto(assistantRow);
	}

	private async requestReplyWithRetry(messages: AiChatMessage[]) {
		try {
			return await this.aiClient.chat(messages);
		} catch (error) {
			if (!isRetryable(error)) {
				logger.warn({ error }, 'deepseek request failed, not retryable');
				throw new AiTrainerError();
			}

			await sleep(RETRY_DELAY_MS);

			try {
				return await this.aiClient.chat(messages);
			} catch (retryError) {
				logger.warn({ error: retryError }, 'deepseek request failed after one retry');
				throw new AiTrainerError();
			}
		}
	}
}
