import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { users, workoutPrograms } from '../db/schema';
import { ChatMessageRepository } from '../repositories/chatMessageRepository';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { ProgramRepository } from '../repositories/programRepository';
import type {
	AiChatMessage,
	AiChatOptions,
	AiClient,
	AiResponse
} from '../external/deepseekClient';
import { DeepseekApiError } from '../external/deepseekClient';
import {
	AiTrainerError,
	AiTrainerService,
	DraftAlreadySavedError,
	DraftNotFoundError,
	InvalidAiResponseError,
	RateLimitExceededError,
	type ProfileForGeneration
} from './aiTrainerService';

class FakeAiClient implements AiClient {
	public calls: AiChatMessage[][] = [];
	public options: (AiChatOptions | undefined)[] = [];
	private readonly responses: (AiResponse | Error)[];

	constructor(...responses: (AiResponse | Error)[]) {
		this.responses = responses;
	}

	async chat(messages: AiChatMessage[], options?: AiChatOptions): Promise<AiResponse> {
		this.calls.push(messages);
		this.options.push(options);
		const next = this.responses[this.calls.length - 1];
		if (next instanceof Error) throw next;
		return next ?? { content: 'default reply' };
	}
}

const PROFILE: ProfileForGeneration = { goal: 'lose', level: 'beginner', constraints: null };

const VALID_PROGRAM = {
	title: 'Fat Loss Kickstart',
	days: [
		{
			dayIndex: 0,
			exercises: [{ exerciseName: 'Push-Up', sets: 3, reps: '10-12', restSeconds: 60 }]
		}
	]
};

const VALID_PROGRAM_JSON = JSON.stringify(VALID_PROGRAM);

/** The coach answering by calling the program tool rather than in text. */
const BUILD_PROGRAM_CALL: AiResponse = { content: '', toolCalls: ['build_program'] };

describe('AiTrainerService', () => {
	let db: Awaited<ReturnType<typeof createTestDb>>;
	let chatMessageRepository: ChatMessageRepository;
	let exerciseRepository: ExerciseRepository;
	let programRepository: ProgramRepository;
	let userId: number;

	beforeEach(async () => {
		db = await createTestDb();
		chatMessageRepository = new ChatMessageRepository(db);
		exerciseRepository = new ExerciseRepository(db);
		programRepository = new ProgramRepository(db);
		const row = await db
			.insert(users)
			.values({ telegramId: '1', createdAt: new Date() })
			.returning()
			.get();
		userId = row.id;
	});

	function makeService(aiClient: AiClient) {
		return new AiTrainerService(
			aiClient,
			chatMessageRepository,
			exerciseRepository,
			programRepository
		);
	}

	it('persists the user message and the assistant reply, returning the reply', async () => {
		const aiClient = new FakeAiClient({ content: 'Great, let’s get moving!' });
		const service = makeService(aiClient);

		const reply = await service.sendMessage(userId, 'I feel tired today', PROFILE);

		expect(reply.role).toBe('assistant');
		expect(reply.content).toBe('Great, let’s get moving!');

		const history = await service.history(userId);
		expect(history.map((m) => [m.role, m.content])).toEqual([
			['user', 'I feel tired today'],
			['assistant', 'Great, let’s get moving!']
		]);
	});

	it('leads with a system prompt that pins the reply language, then the mapped history', async () => {
		const aiClient = new FakeAiClient({ content: 'ok' });
		const service = makeService(aiClient);

		await service.sendMessage(userId, 'hello', PROFILE);

		const [systemPrompt, ...history] = aiClient.calls[0];
		expect(systemPrompt.role).toBe('system');
		expect(systemPrompt.content).toContain('по-русски');
		expect(history).toEqual([{ role: 'user', content: 'hello' }]);
	});

	it('retries once on a 500 and returns a clean error if it fails again', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(500), new DeepseekApiError(500));
		const service = makeService(aiClient);

		await expect(service.sendMessage(userId, 'hi', PROFILE)).rejects.toThrow(AiTrainerError);
		expect(aiClient.calls).toHaveLength(2);
	});

	it('recovers when the retry succeeds after a transient failure', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(500), { content: 'recovered' });
		const service = makeService(aiClient);

		const reply = await service.sendMessage(userId, 'hi', PROFILE);

		expect(reply.content).toBe('recovered');
		expect(aiClient.calls).toHaveLength(2);
	});

	it('does not retry on a non-retryable (4xx) failure', async () => {
		const aiClient = new FakeAiClient(new DeepseekApiError(401));
		const service = makeService(aiClient);

		await expect(service.sendMessage(userId, 'hi', PROFILE)).rejects.toThrow(AiTrainerError);
		expect(aiClient.calls).toHaveLength(1);
	});

	it('rejects with RateLimitExceededError past 30 messages in the last hour', async () => {
		for (let i = 0; i < 30; i++) {
			await chatMessageRepository.append(userId, 'user', `msg ${i}`);
		}

		const aiClient = new FakeAiClient({ content: 'should not be called' });
		const service = makeService(aiClient);

		await expect(service.sendMessage(userId, 'one too many', PROFILE)).rejects.toThrow(
			RateLimitExceededError
		);
		expect(aiClient.calls).toHaveLength(0);
	});

	describe('generateProgram', () => {
		it('builds the program from what the athlete told the coach as well as the profile', async () => {
			await chatMessageRepository.append(userId, 'user', 'Тренируюсь дома, есть только гантели');
			await chatMessageRepository.append(userId, 'assistant', 'Понял, соберу под гантели.');
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			await service.generateProgram(userId, PROFILE);

			const conversation = aiClient.calls[0].filter((message) => message.role !== 'system');
			expect(conversation.slice(0, 2)).toEqual([
				{ role: 'user', content: 'Тренируюсь дома, есть только гантели' },
				{ role: 'assistant', content: 'Понял, соберу под гантели.' }
			]);

			// The profile closes the request, so it is the last word on goal and level.
			const request = conversation.at(-1)!;
			expect(request.role).toBe('user');
			expect(request.content).toContain('Goal: lose');
			expect(request.content).toContain('Level: beginner');
		});

		it('sends only the most recent 20 messages of the conversation', async () => {
			for (let index = 1; index <= 25; index++) {
				await chatMessageRepository.append(userId, 'user', `message ${index}`);
			}
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			await service.generateProgram(userId, PROFILE);

			const sent = aiClient.calls[0]
				.map((message) => message.content)
				.filter((content) => content.startsWith('message '));
			expect(sent).toHaveLength(20);
			expect(sent[0]).toBe('message 6');
			expect(sent.at(-1)).toBe('message 25');
		});

		it('parses a valid JSON response, matches/creates exercises and saves the program', async () => {
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			const program = await service.generateProgram(userId, PROFILE);

			expect(program.title).toBe('Fat Loss Kickstart');
			expect(program.source).toBe('ai_generated');
			expect(program.days).toEqual([
				{
					dayIndex: 0,
					exercises: [expect.objectContaining({ exerciseName: 'Push-Up', sets: 3, reps: '10-12' })]
				}
			]);

			const exercise = await exerciseRepository.findByNormalizedName('push-up');
			expect(exercise).not.toBeNull();
		});

		it('reuses an existing exercise instead of creating a duplicate', async () => {
			const existing = await exerciseRepository.findOrCreateByName('Push-Up');
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			const program = await service.generateProgram(userId, PROFILE);

			expect(program.days[0].exercises[0].exerciseId).toBe(existing.id);
		});

		it('rejects a response that is not valid JSON and saves nothing', async () => {
			const aiClient = new FakeAiClient({ content: 'not json at all' });
			const service = makeService(aiClient);

			await expect(service.generateProgram(userId, PROFILE)).rejects.toThrow(
				InvalidAiResponseError
			);

			const savedPrograms = await db.select().from(workoutPrograms).all();
			expect(savedPrograms).toHaveLength(0);
		});

		it('rejects JSON that does not match the program schema and saves nothing', async () => {
			const aiClient = new FakeAiClient({ content: JSON.stringify({ title: 'No days here' }) });
			const service = makeService(aiClient);

			await expect(service.generateProgram(userId, PROFILE)).rejects.toThrow(
				InvalidAiResponseError
			);

			const savedPrograms = await db.select().from(workoutPrograms).all();
			expect(savedPrograms).toHaveLength(0);
		});

		it('shows the model the existing library so it reuses names instead of inventing synonyms', async () => {
			await exerciseRepository.findOrCreateByName('Bicep Curl');
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			await service.generateProgram(userId, PROFILE);

			const prompt = aiClient.calls[0].map((message) => message.content).join('\n');
			expect(prompt).toContain('Bicep Curl');
		});

		it('tells the model to keep exercise names free of notes, which would fragment the library', async () => {
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			await service.generateProgram(userId, PROFILE);

			expect(aiClient.calls[0][0].content).toContain('No parentheses');
		});

		it('requests a JSON-mode response from the AiClient', async () => {
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			let capturedOptions: unknown;
			const spyingClient: AiClient = {
				chat: (messages, options) => {
					capturedOptions = options;
					return aiClient.chat(messages);
				}
			};
			const service = makeService(spyingClient);

			await service.generateProgram(userId, PROFILE);

			expect(capturedOptions).toEqual({ responseFormat: 'json' });
		});
	});

	describe('program drafts in the chat', () => {
		it('offers the model a build_program tool on every chat message', async () => {
			const aiClient = new FakeAiClient({ content: 'ok' });
			const service = makeService(aiClient);

			await service.sendMessage(userId, 'hello', PROFILE);

			expect(aiClient.options[0]?.tools?.map((tool) => tool.name)).toEqual(['build_program']);
		});

		it('answers a program request with a validated draft, without adding it to the programs', async () => {
			const aiClient = new FakeAiClient(BUILD_PROGRAM_CALL, { content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			const reply = await service.sendMessage(userId, 'Составь мне программу', PROFILE);

			expect(reply.role).toBe('assistant');
			expect(reply.content).not.toBe('');
			expect(reply.programDraft).toEqual(VALID_PROGRAM);
			expect(reply.savedProgramId).toBeNull();
			expect(aiClient.options[1]).toEqual({ responseFormat: 'json' });

			expect(await db.select().from(workoutPrograms).all()).toHaveLength(0);
			expect(await exerciseRepository.findByNormalizedName('push-up')).toBeNull();

			const history = await service.history(userId);
			expect(history.at(-1)?.programDraft).toEqual(VALID_PROGRAM);
		});

		it('keeps the words the coach wrote alongside the tool call', async () => {
			const aiClient = new FakeAiClient(
				{ content: 'Лови программу на три дня.', toolCalls: ['build_program'] },
				{ content: VALID_PROGRAM_JSON }
			);
			const service = makeService(aiClient);

			const reply = await service.sendMessage(userId, 'Составь программу', PROFILE);

			expect(reply.content).toBe('Лови программу на три дня.');
		});

		it('rejects an invalid draft and stores no coach reply', async () => {
			const aiClient = new FakeAiClient(BUILD_PROGRAM_CALL, { content: 'not json at all' });
			const service = makeService(aiClient);

			await expect(service.sendMessage(userId, 'Составь программу', PROFILE)).rejects.toThrow(
				InvalidAiResponseError
			);

			const history = await service.history(userId);
			expect(history.map((message) => message.role)).toEqual(['user']);
		});

		it('asks for the profile instead of building a program when goal or level is missing', async () => {
			const aiClient = new FakeAiClient(BUILD_PROGRAM_CALL);
			const service = makeService(aiClient);

			const reply = await service.sendMessage(userId, 'Составь программу', null);

			expect(aiClient.calls).toHaveLength(1);
			expect(reply.programDraft).toBeNull();
			expect(reply.content).toContain('профил');
		});

		it('shows the model the latest draft, so an edit request builds on it', async () => {
			await chatMessageRepository.append(userId, 'assistant', 'Собрал программу.', VALID_PROGRAM);
			const aiClient = new FakeAiClient(BUILD_PROGRAM_CALL, { content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			await service.sendMessage(userId, 'Замени отжимания на жим гантелей', PROFILE);

			for (const call of aiClient.calls) {
				const draftMessage = call.find((message) => message.role === 'assistant');
				expect(draftMessage?.content).toContain('Fat Loss Kickstart');
				expect(draftMessage?.content).toContain('Push-Up');
			}
		});

		it('puts a header-button draft into the chat as a coach message only', async () => {
			const aiClient = new FakeAiClient({ content: VALID_PROGRAM_JSON });
			const service = makeService(aiClient);

			const message = await service.draftProgram(userId, PROFILE);

			expect(message.programDraft).toEqual(VALID_PROGRAM);
			const history = await service.history(userId);
			expect(history.map((entry) => entry.role)).toEqual(['assistant']);
			expect(await db.select().from(workoutPrograms).all()).toHaveLength(0);
		});
	});

	describe('saveDraft', () => {
		async function appendDraft(ownerId = userId) {
			return chatMessageRepository.append(ownerId, 'assistant', 'Собрал программу.', VALID_PROGRAM);
		}

		it('adds the draft to the programs once and links it to the message', async () => {
			const draftMessage = await appendDraft();
			const service = makeService(new FakeAiClient());

			const { program, message } = await service.saveDraft(userId, draftMessage.id);

			expect(program.title).toBe('Fat Loss Kickstart');
			expect(program.source).toBe('ai_generated');
			expect(message.savedProgramId).toBe(program.id);

			await expect(service.saveDraft(userId, draftMessage.id)).rejects.toThrow(
				DraftAlreadySavedError
			);
			expect(await db.select().from(workoutPrograms).all()).toHaveLength(1);
		});

		it('refuses a draft from another athlete and a message with no draft', async () => {
			const other = await db
				.insert(users)
				.values({ telegramId: '2', createdAt: new Date() })
				.returning()
				.get();
			const othersDraft = await appendDraft(other.id);
			const plainMessage = await chatMessageRepository.append(userId, 'assistant', 'Привет!');
			const service = makeService(new FakeAiClient());

			await expect(service.saveDraft(userId, othersDraft.id)).rejects.toThrow(DraftNotFoundError);
			await expect(service.saveDraft(userId, plainMessage.id)).rejects.toThrow(DraftNotFoundError);
			expect(await db.select().from(workoutPrograms).all()).toHaveLength(0);
		});

		it('lets a draft be added again once its program was deleted', async () => {
			const draftMessage = await appendDraft();
			const service = makeService(new FakeAiClient());
			const first = await service.saveDraft(userId, draftMessage.id);

			await programRepository.archiveForUser(first.program.id, userId);

			const history = await service.history(userId);
			expect(history.at(-1)?.savedProgramId).toBeNull();

			const second = await service.saveDraft(userId, draftMessage.id);
			expect(second.program.id).not.toBe(first.program.id);
			expect(second.message.savedProgramId).toBe(second.program.id);
		});
	});
});
