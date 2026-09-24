import { and, asc, desc, eq, gte, type SQL } from 'drizzle-orm';
import type { WorkoutLogDto } from '$lib/types';
import type { LogWorkoutSetInput } from '$lib/validation/schemas';
import { db } from '../db/client';
import { exercises, programExercises, workoutLogs, workoutPrograms } from '../db/schema';

export type WorkoutLogRow = typeof workoutLogs.$inferSelect;

export interface WorkoutLogWithExercise {
	log: WorkoutLogRow;
	programId: number;
	programTitle: string;
	exerciseName: string;
}

export function toWorkoutLogDto(entry: WorkoutLogWithExercise): WorkoutLogDto {
	return {
		id: entry.log.id,
		programExerciseId: entry.log.programExerciseId,
		programId: entry.programId,
		programTitle: entry.programTitle,
		exerciseName: entry.exerciseName,
		performedAt: entry.log.performedAt.toISOString(),
		setsDone: entry.log.setsDone,
		repsDone: entry.log.repsDone,
		weightKg: entry.log.weightKg
	};
}

export class WorkoutLogRepository {
	constructor(private readonly database = db) {}

	async create(userId: number, input: LogWorkoutSetInput): Promise<WorkoutLogRow> {
		return this.database
			.insert(workoutLogs)
			.values({
				userId,
				programExerciseId: input.programExerciseId,
				performedAt: new Date(),
				setsDone: input.setsDone,
				repsDone: input.repsDone,
				weightKg: input.weightKg
			})
			.returning()
			.get();
	}

	private joinedQuery(where: SQL | undefined) {
		return this.database
			.select({
				log: workoutLogs,
				programId: workoutPrograms.id,
				programTitle: workoutPrograms.title,
				exerciseName: exercises.name
			})
			.from(workoutLogs)
			.innerJoin(programExercises, eq(workoutLogs.programExerciseId, programExercises.id))
			.innerJoin(workoutPrograms, eq(programExercises.programId, workoutPrograms.id))
			.innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
			.where(where);
	}

	async findById(logId: number): Promise<WorkoutLogWithExercise | null> {
		const row = await this.joinedQuery(eq(workoutLogs.id, logId)).get();
		return row ?? null;
	}

	/** Logged entries from `since` onwards, oldest first, for building activity summaries. */
	async listForUserSince(userId: number, since: Date): Promise<WorkoutLogWithExercise[]> {
		return this.joinedQuery(
			and(eq(workoutLogs.userId, userId), gte(workoutLogs.performedAt, since))
		)
			.orderBy(asc(workoutLogs.performedAt))
			.all();
	}

	/** Logged entries for a user, most recent first, optionally narrowed to one program. */
	async listForUser(userId: number, programId?: number): Promise<WorkoutLogWithExercise[]> {
		const scope = programId
			? and(eq(workoutLogs.userId, userId), eq(workoutPrograms.id, programId))
			: eq(workoutLogs.userId, userId);

		return this.joinedQuery(scope)
			.orderBy(desc(workoutLogs.performedAt), desc(workoutLogs.id))
			.all();
	}
}
