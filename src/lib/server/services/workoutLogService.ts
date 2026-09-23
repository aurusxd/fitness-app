import type { WorkoutLogDto } from '$lib/types';
import type { LogWorkoutSetInput } from '$lib/validation/schemas';
import { ProgramRepository } from '../repositories/programRepository';
import { WorkoutLogRepository, toWorkoutLogDto } from '../repositories/workoutLogRepository';

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

	async historyForProgram(userId: number, programId: number): Promise<WorkoutLogDto[]> {
		const entries = await this.workoutLogRepository.listForUser(userId, programId);
		return entries.map(toWorkoutLogDto);
	}
}
