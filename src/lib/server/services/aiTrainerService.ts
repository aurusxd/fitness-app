import type { ChatMessageDto } from '$lib/types';
import { generatedProgramSchema, type GeneratedProgram } from '$lib/validation/schemas';
import { ChatMessageRepository, toChatMessageDto } from '../repositories/chatMessageRepository';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { ProgramRepository, type NewProgramExercise } from '../repositories/programRepository';
import type { WorkoutProgram } from '../domain/workoutProgram';
import {
	DeepseekApiError,
	type AiChatMessage,
	type AiChatOptions,
	type AiClient
} from '../external/deepseekClient';
import { logger } from '../logger';

const HISTORY_LIMIT = 20;
const RATE_LIMIT_PER_HOUR = 30;
const RETRY_DELAY_MS = 1000;

/** Exercise names are matched against the library by exact name, so noisy names create duplicates. */
const PROGRAM_SYSTEM_PROMPT = `You are a certified fitness trainer. Generate a workout program as strict JSON only, with no markdown and no commentary, matching exactly this shape:
{"title": string, "days": [{"dayIndex": number (0-6), "exercises": [{"exerciseName": string, "sets": number, "reps": string, "restSeconds": number}]}]}

Rules for exerciseName:
- Use the plain, canonical name of the movement only: "Goblet Squat", never "Goblet Squat (light, pain-free)".
- No parentheses, no notes, no coaching cues, no equipment qualifiers beyond the standard name.
- Express adjustments for the athlete's limits by choosing a safer movement, not by annotating the name.

The "title" field is shown to the athlete, so write it in Russian. Exercise names stay English.`;

/** Without one the model mirrors the language of the last message, and the app is Russian (tech.md §5). */
const CHAT_SYSTEM_PROMPT = `Ты — сертифицированный фитнес-тренер в мобильном приложении. Всегда отвечай по-русски, на «ты», коротко и по делу — один-два абзаца, без markdown-разметки и списков.
Названия упражнений пиши по-английски, как они заведены в библиотеке (например, Goblet Squat), остальное — по-русски.
Не ставь диагнозов и не давай медицинских рекомендаций: при боли советуй обратиться к врачу.`;

const LIBRARY_PROMPT_LIMIT = 120;

export interface ProfileForGeneration {
	goal: 'gain' | 'lose' | 'maintain';
	level: 'beginner' | 'intermediate' | 'advanced';
	constraints: string | null;
}

export class RateLimitExceededError extends Error {
	constructor() {
		super('Слишком много сообщений за этот час. Подожди немного.');
		this.name = 'RateLimitExceededError';
	}
}

export class AiTrainerError extends Error {
	constructor(message = 'ИИ-тренер сейчас недоступен. Попробуй ещё раз.') {
		super(message);
		this.name = 'AiTrainerError';
	}
}

export class InvalidAiResponseError extends Error {
	constructor() {
		super('ИИ вернул некорректную программу. Попробуй ещё раз.');
		this.name = 'InvalidAiResponseError';
	}
}

function isRetryable(error: unknown): boolean {
	if (error instanceof DeepseekApiError) return error.status >= 500;
	return error instanceof Error && error.name === 'AbortError';
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProfileMessage(profile: ProfileForGeneration): string {
	return [
		`Goal: ${profile.goal}.`,
		`Level: ${profile.level}.`,
		profile.constraints ? `Constraints: ${profile.constraints}.` : null
	]
		.filter(Boolean)
		.join(' ');
}

export class AiTrainerService {
	constructor(
		private readonly aiClient: AiClient,
		private readonly chatMessageRepository: ChatMessageRepository = new ChatMessageRepository(),
		private readonly exerciseRepository: ExerciseRepository = new ExerciseRepository(),
		private readonly programRepository: ProgramRepository = new ProgramRepository()
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
		const messages: AiChatMessage[] = [
			{ role: 'system', content: CHAT_SYSTEM_PROMPT },
			...history.map((row) => ({
				role: row.role,
				content: row.content
			}))
		];

		const reply = await this.requestReplyWithRetry(messages);

		const assistantRow = await this.chatMessageRepository.append(
			userId,
			'assistant',
			reply.content
		);
		return toChatMessageDto(assistantRow);
	}

	/** Generates a structured workout program from the user's profile and persists it, or rejects without saving anything (tech.md §5). */
	async generateProgram(userId: number, profile: ProfileForGeneration): Promise<WorkoutProgram> {
		// Showing the model what the library already holds keeps it from inventing synonyms
		// like "Dumbbell Biceps Curl" for an exercise stored as "Bicep Curl".
		const known = await this.exerciseRepository.list();
		const knownNames = known.slice(0, LIBRARY_PROMPT_LIMIT).map((exercise) => exercise.name);

		const messages: AiChatMessage[] = [
			{ role: 'system', content: PROGRAM_SYSTEM_PROMPT },
			...(knownNames.length > 0
				? [
						{
							role: 'system' as const,
							content: `Reuse these exact names whenever the movement matches one of them: ${knownNames.join(', ')}.`
						}
					]
				: []),
			{ role: 'user', content: buildProfileMessage(profile) }
		];

		const response = await this.requestReplyWithRetry(messages, { responseFormat: 'json' });

		let parsed: unknown;
		try {
			parsed = JSON.parse(response.content);
		} catch {
			logger.warn({ raw: response.content }, 'deepseek program response is not valid JSON');
			throw new InvalidAiResponseError();
		}

		const result = generatedProgramSchema.safeParse(parsed);
		if (!result.success) {
			logger.warn(
				{ raw: response.content, issues: result.error.issues },
				'deepseek program response failed schema validation'
			);
			throw new InvalidAiResponseError();
		}

		return this.saveGeneratedProgram(userId, result.data);
	}

	private async saveGeneratedProgram(
		userId: number,
		program: GeneratedProgram
	): Promise<WorkoutProgram> {
		const exercisesToInsert: NewProgramExercise[] = [];

		for (const day of program.days) {
			let orderIndex = 0;
			for (const exercise of day.exercises) {
				const exerciseRow = await this.exerciseRepository.findOrCreateByName(exercise.exerciseName);
				exercisesToInsert.push({
					exerciseId: exerciseRow.id,
					dayIndex: day.dayIndex,
					orderIndex: orderIndex++,
					sets: exercise.sets,
					reps: exercise.reps,
					restSeconds: exercise.restSeconds
				});
			}
		}

		return this.programRepository.create(userId, program.title, 'ai_generated', exercisesToInsert);
	}

	private async requestReplyWithRetry(messages: AiChatMessage[], options?: AiChatOptions) {
		try {
			return await this.aiClient.chat(messages, options);
		} catch (error) {
			if (!isRetryable(error)) {
				logger.warn({ err: error }, 'deepseek request failed, not retryable');
				throw new AiTrainerError();
			}

			await sleep(RETRY_DELAY_MS);

			try {
				return await this.aiClient.chat(messages, options);
			} catch (retryError) {
				logger.warn({ err: retryError }, 'deepseek request failed after one retry');
				throw new AiTrainerError();
			}
		}
	}
}
