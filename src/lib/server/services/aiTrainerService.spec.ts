import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { users } from '../db/schema';
import { ChatMessageRepository } from '../repositories/chatMessageRepository';
import type { AiChatMessage, AiClient, AiResponse } from '../external/deepseekClient';
import { DeepseekApiError } from '../external/deepseekClient';
import { AiTrainerError, AiTrainerService, RateLimitExceededError } from './aiTrainerService';

class FakeAiClient implements AiClient {
	public calls: AiChatMessage[][] = [];
	private readonly responses: (AiResponse | Error)[];

	constructor(...responses: (AiResponse | Error)[]) {
		this.responses = responses;
	}

	async chat(messages: AiChatMessage[]): Promise<AiResponse> {
		this.calls.push(messages);
		const next = this.responses[this.calls.length - 1];
		if (next instanceof Error) throw next;
		return next ?? { content: 'default reply' };
	}
}

describe('AiTrainerService', () => {
	let chatMessageRepository: ChatMessageRepository;
	let userId: number;

	beforeEach(async () => {
		const db = await createTestDb();
		chatMessageRepository = new ChatMessageRepository(db);
		const row = await db
			.insert(users)
			.values({ telegramId: '1', createdAt: new Date() })
			.returning()
			.get();
		userId = row.id;
	});

	it('persists the user message and the assistant reply, returning the reply', async () => {
		const aiClient = new FakeAiClient({ content: 'Great, let’s get moving!' });
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		const reply = await service.sendMessage(userId, 'I feel tired today');

		expect(reply.role).toBe('assistant');
		expect(reply.content).toBe('Great, let’s get moving!');

		const history = await service.history(userId);
		expect(history.map((m) => [m.role, m.content])).toEqual([
			['user', 'I feel tired today'],
			['assistant', 'Great, let’s get moving!']
		]);
	});

	it('sends the conversation history to the AiClient with mapped roles', async () => {
		const aiClient = new FakeAiClient({ content: 'ok' });
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		await service.sendMessage(userId, 'hello');

		expect(aiClient.calls[0]).toEqual([{ role: 'user', content: 'hello' }]);
	});

	it('retries once on a 500 and returns a clean error if it fails again', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(500), new DeepseekApiError(500));
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		await expect(service.sendMessage(userId, 'hi')).rejects.toThrow(AiTrainerError);
		expect(aiClient.calls).toHaveLength(2);
	});

	it('recovers when the retry succeeds after a transient failure', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(500), { content: 'recovered' });
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		const reply = await service.sendMessage(userId, 'hi');

		expect(reply.content).toBe('recovered');
		expect(aiClient.calls).toHaveLength(2);
	});

	it('does not retry on a non-retryable (4xx) failure', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(401));
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		await expect(service.sendMessage(userId, 'hi')).rejects.toThrow(AiTrainerError);
		expect(aiClient.calls).toHaveLength(1);
	});

	it('rejects with RateLimitExceededError past 30 messages in the last hour', async () => {
		for (let i = 0; i < 30; i++) {
			await chatMessageRepository.append(userId, 'user', `msg ${i}`);
		}

		const aiClient = new FakeAiClient({ content: 'should not be called' });
		const service = new AiTrainerService(aiClient, chatMessageRepository);

		await expect(service.sendMessage(userId, 'one too many')).rejects.toThrow(
			RateLimitExceededError
		);
		expect(aiClient.calls).toHaveLength(0);
	});
});
