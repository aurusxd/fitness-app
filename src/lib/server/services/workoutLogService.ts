import type { ActivityDayDto, WorkoutLogDto, WorkoutSummaryDto } from '$lib/types';
import type { LogWorkoutSetInput } from '$lib/validation/schemas';
import { ProgramRepository } from '../repositories/programRepository';
import { WorkoutLogRepository, toWorkoutLogDto } from '../repositories/workoutLogRepository';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days are keyed in UTC so the server and the rendered calendar never disagree. */
function toDateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function* eachDateFrom(from: Date, to: Date): Generator<string> {
	const cursor = new Date(from);
	cursor.setUTCHours(0, 0, 0, 0);

	const last = new Date(to);
	last.setUTCHours(0, 0, 0, 0);

	while (cursor.getTime() <= last.getTime()) {
		yield toDateKey(cursor);
		cursor.setTime(cursor.getTime() + DAY_MS);
	}
}

/** Raised when the exercise does not exist or belongs to another user's program. */
export class ProgramExerciseNotFoundError extends Error {
	constructor() {
		super('That exercise is not part of one of your programs.');
		this.name = 'ProgramExerciseNotFoundError';
	}
}

export class WorkoutLogService {
	constructor(
		private readonly workoutLogRepository: WorkoutLogRepository = new WorkoutLogRepository(),
		private readonly programRepository: ProgramRepository = new ProgramRepository()
	) {}

	async logSet(userId: number, input: LogWorkoutSetInput): Promise<WorkoutLogDto> {
		const owned = await this.programRepository.programExerciseBelongsTo(
			input.programExerciseId,
			userId
		);
		if (!owned) {
			throw new ProgramExerciseNotFoundError();
		}

		const row = await this.workoutLogRepository.create(userId, input);
		const entry = await this.workoutLogRepository.findById(row.id);
		if (!entry) {
			throw new Error('Workout log was created but could not be reloaded');
		}

		return toWorkoutLogDto(entry);
	}

	async historyForUser(userId: number): Promise<WorkoutLogDto[]> {
		const entries = await this.workoutLogRepository.listForUser(userId);
		return entries.map(toWorkoutLogDto);
	}

	/** Everything logged from `since` onwards, oldest first. */
	async historySince(userId: number, since: Date): Promise<WorkoutLogDto[]> {
		const entries = await this.workoutLogRepository.listForUserSince(userId, since);
		return entries.map(toWorkoutLogDto);
	}

	async historyForProgram(userId: number, programId: number): Promise<WorkoutLogDto[]> {
		const entries = await this.workoutLogRepository.listForUser(userId, programId);
		return entries.map(toWorkoutLogDto);
	}

	/**
	 * Activity between `from` and `to` (today by default; a week strip passes a `to` in the
	 * future to cover days not trained yet). `perDay` covers every day in the window, including
	 * the empty ones, so callers can render a calendar or chart without filling gaps themselves.
	 */
	async summary(userId: number, from: Date, to: Date = new Date()): Promise<WorkoutSummaryDto> {
		const entries = await this.workoutLogRepository.listForUserSince(userId, from);

		const setsByDate = new Map<string, number>();
		let setsLogged = 0;

		for (const entry of entries) {
			const date = toDateKey(entry.log.performedAt);
			setsByDate.set(date, (setsByDate.get(date) ?? 0) + entry.log.setsDone);
			setsLogged += entry.log.setsDone;
		}

		const perDay: ActivityDayDto[] = [];
		for (const date of eachDateFrom(from, to)) {
			perDay.push({ date, sets: setsByDate.get(date) ?? 0 });
		}

		return {
			trainingDays: setsByDate.size,
			exercisesLogged: entries.length,
			setsLogged,
			perDay
		};
	}
}
