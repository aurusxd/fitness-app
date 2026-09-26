import type { ChatMessageDto } from '$lib/types';
import { generatedProgramSchema, type GeneratedProgram } from '$lib/validation/schemas';
import {
	ChatMessageRepository,
	toChatMessageDto,
	type ChatMessageRow
} from '../repositories/chatMessageRepository';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { ProgramRepository, type NewProgramExercise } from '../repositories/programRepository';
import type { WorkoutProgram } from '../domain/workoutProgram';
import {
	DeepseekApiError,
	type AiChatMessage,
	type AiChatOptions,
	type AiClient,
	type AiTool
} from '../external/deepseekClient';
import { logger } from '../logger';

const HISTORY_LIMIT = 20;
const RATE_LIMIT_PER_HOUR = 30;
const RETRY_DELAY_MS = 1000;

/** Exercise names are matched against the library by exact name, so noisy names create duplicates. */
const PROGRAM_SYSTEM_PROMPT = `You are a certified fitness trainer. Generate a workout program as strict JSON only, with no markdown and no commentary, matching exactly this shape:
{"title": string, "days": [{"dayIndex": number (0-6), "exercises": [{"exerciseName": string, "sets": number, "reps": string, "restSeconds": number}]}]}

Rules for exerciseName:
- Write it in Russian, as the plain canonical name of the movement: "Приседания со штангой", never "Приседания со штангой (лёгкие, без боли)".
- No parentheses, no notes, no coaching cues, no equipment qualifiers beyond the standard name.
- Express adjustments for the athlete's limits by choosing a safer movement, not by annotating the name.

The "title" field is shown to the athlete, so write it in Russian too.

The athlete's goal and level come from their saved profile, given in the last message. The conversation before it is what they told their coach: take into account everything in it that shapes a program - available equipment, training days per week, session length, injuries and pain, exercises they like or want to avoid. Limits from the conversation add to the profile's constraints. If the conversation contradicts the profile's goal or level, follow the profile.

The conversation may already hold program drafts, attached to the coach's messages as JSON. If the athlete asked to change a draft, start from the latest one and apply exactly the requested changes, keeping everything else as it was.`;

/** Without one the model mirrors the language of the last message, and the app is Russian (tech.md §5). */
const CHAT_SYSTEM_PROMPT = `Ты — сертифицированный фитнес-тренер в мобильном приложении. Всегда отвечай по-русски, на «ты», коротко и по делу — один-два абзаца, без markdown-разметки и списков.
Названия упражнений пиши по-русски, общепринятыми названиями (например, «Приседания со штангой»).
Не ставь диагнозов и не давай медицинских рекомендаций: при боли советуй обратиться к врачу.
Когда просят составить, собрать или поправить программу тренировок, вызови функцию build_program: она соберёт программу и покажет её карточкой с кнопкой «Добавить». Саму программу текстом не расписывай.
Черновики программ приложены к твоим прошлым сообщениям как JSON только для контекста, сам JSON никогда не пиши.`;

/** The model calls this instead of writing a program out as text (tech.md §5, v15). */
const BUILD_PROGRAM_TOOL: AiTool = {
	name: 'build_program',
	description:
		'Собрать черновик программы тренировок по профилю и разговору. Вызывай, когда просят составить новую программу или изменить черновик.'
};

const DRAFT_REPLY =
	'Собрал программу. Посмотри и добавь её в программы, если подходит, или скажи, что поправить.';
const PROFILE_REQUIRED_REPLY =
	'Чтобы собрать программу, заполни в профиле цель и уровень, а потом попроси ещё раз.';

/** Drafts ride along in the context as JSON, so the model knows what an edit request refers to. */
function toAiMessage(row: ChatMessageRow): AiChatMessage {
	return {
		role: row.role,
		content: row.programDraft
			? `${row.content}\n\nЧерновик программы (JSON): ${JSON.stringify(row.programDraft)}`
			: row.content
	};
}

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

export class DraftNotFoundError extends Error {
	constructor() {
		super('Черновик программы не найден');
		this.name = 'DraftNotFoundError';
	}
}

export class DraftAlreadySavedError extends Error {
	constructor() {
		super('Эта программа уже добавлена');
		this.name = 'DraftAlreadySavedError';
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

	/** `profile` is null while the athlete has not set a goal and level, which a program needs. */
	async sendMessage(
		userId: number,
		content: string,
		profile: ProfileForGeneration | null
	): Promise<ChatMessageDto> {
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
			...history.map(toAiMessage)
		];

		const reply = await this.requestReplyWithRetry(messages, { tools: [BUILD_PROGRAM_TOOL] });

		if (!reply.toolCalls?.includes(BUILD_PROGRAM_TOOL.name)) {
			const assistantRow = await this.chatMessageRepository.append(
				userId,
				'assistant',
				reply.content
			);
			return toChatMessageDto(assistantRow);
		}

		if (!profile) {
			const assistantRow = await this.chatMessageRepository.append(
				userId,
				'assistant',
				PROFILE_REQUIRED_REPLY
			);
			return toChatMessageDto(assistantRow);
		}

		const draft = await this.requestProgram(userId, profile);
		const assistantRow = await this.chatMessageRepository.append(
			userId,
			'assistant',
			reply.content.trim() || DRAFT_REPLY,
			draft
		);
		return toChatMessageDto(assistantRow);
	}

	/** Puts a fresh program draft into the chat as the coach's message, with no athlete message before it. */
	async draftProgram(userId: number, profile: ProfileForGeneration): Promise<ChatMessageDto> {
		const draft = await this.requestProgram(userId, profile);
		const row = await this.chatMessageRepository.append(userId, 'assistant', DRAFT_REPLY, draft);
		return toChatMessageDto(row);
	}

	/** Adds the draft attached to a chat message to the athlete's programs (tech.md §5, v15). */
	async saveDraft(
		userId: number,
		messageId: number
	): Promise<{ program: WorkoutProgram; message: ChatMessageDto }> {
		const row = await this.chatMessageRepository.findForUser(messageId, userId);
		if (!row?.programDraft) throw new DraftNotFoundError();
		if (row.savedProgramId !== null) throw new DraftAlreadySavedError();

		const result = generatedProgramSchema.safeParse(row.programDraft);
		if (!result.success) {
			logger.warn({ messageId, issues: result.error.issues }, 'stored program draft is invalid');
			throw new InvalidAiResponseError();
		}

		const program = await this.saveGeneratedProgram(userId, result.data);
		const saved = await this.chatMessageRepository.markDraftSaved(row.id, program.id);
		return { program, message: toChatMessageDto(saved) };
	}

	/** Generates a structured workout program from the user's profile and persists it, or rejects without saving anything (tech.md §5). */
	async generateProgram(userId: number, profile: ProfileForGeneration): Promise<WorkoutProgram> {
		const program = await this.requestProgram(userId, profile);
		return this.saveGeneratedProgram(userId, program);
	}

	/** Asks the model for a program and validates it, saving nothing. */
	private async requestProgram(
		userId: number,
		profile: ProfileForGeneration
	): Promise<GeneratedProgram> {
		// Showing the model what the library already holds keeps it from inventing synonyms
		// like "Dumbbell Biceps Curl" for an exercise stored as "Bicep Curl".
		const known = await this.exerciseRepository.list();
		const knownNames = known.slice(0, LIBRARY_PROMPT_LIMIT).map((exercise) => exercise.name);

		// What the athlete told the coach is half of what the program is built from (tech.md §1, §5).
		const history = await this.chatMessageRepository.recentHistory(userId, HISTORY_LIMIT);

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
			...history.map(toAiMessage),
			{ role: 'user', content: `Build my program now. ${buildProfileMessage(profile)}` }
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

		return result.data;
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
