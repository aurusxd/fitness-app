import { and, desc, eq, isNull } from 'drizzle-orm';
import type { WorkoutProgramDto } from '$lib/types';
import { db } from '../db/client';
import { exercises, programExercises, workoutPrograms } from '../db/schema';
import { WorkoutProgram, type ProgramExerciseWithName } from '../domain/workoutProgram';

export interface NewProgramExercise {
	exerciseId: number;
	dayIndex: number;
	orderIndex: number;
	sets: number;
	reps: string;
	restSeconds?: number;
}

export function toWorkoutProgramDto(program: WorkoutProgram): WorkoutProgramDto {
	return {
		id: program.id,
		title: program.title,
		source: program.source,
		createdAt: program.createdAt.toISOString(),
		days: program.days.map((day) => ({
			dayIndex: day.dayIndex,
			exercises: day.exercises.map((exercise) => ({
				id: exercise.id,
				exerciseName: exercise.exerciseName,
				dayIndex: exercise.dayIndex,
				orderIndex: exercise.orderIndex,
				sets: exercise.sets,
				reps: exercise.reps,
				restSeconds: exercise.restSeconds
			}))
		}))
	};
}

export class ProgramRepository {
	constructor(private readonly database = db) {}

	async create(
		userId: number,
		title: string,
		source: 'ai_generated' | 'manual',
		exercisesToInsert: NewProgramExercise[]
	): Promise<WorkoutProgram> {
		const programRow = await this.database
			.insert(workoutPrograms)
			.values({ userId, title, source, createdAt: new Date() })
			.returning()
			.get();

		if (exercisesToInsert.length > 0) {
			await this.database
				.insert(programExercises)
				.values(exercisesToInsert.map((exercise) => ({ ...exercise, programId: programRow.id })));
		}

		const created = await this.findById(programRow.id);
		if (!created) {
			throw new Error('Program was created but could not be reloaded');
		}
		return created;
	}

	async findById(programId: number): Promise<WorkoutProgram | null> {
		const programRow = await this.database
			.select()
			.from(workoutPrograms)
			.where(eq(workoutPrograms.id, programId))
			.get();
		if (!programRow) return null;

		const rows = await this.database
			.select({ programExercise: programExercises, exerciseName: exercises.name })
			.from(programExercises)
			.innerJoin(exercises, eq(programExercises.exerciseId, exercises.id))
			.where(eq(programExercises.programId, programId))
			.all();

		const exerciseRows: ProgramExerciseWithName[] = rows.map((row) => ({
			...row.programExercise,
			exerciseName: row.exerciseName
		}));

		return new WorkoutProgram(programRow, exerciseRows);
	}

	async findByIdForUser(programId: number, userId: number): Promise<WorkoutProgram | null> {
		const programRow = await this.database
			.select()
			.from(workoutPrograms)
			.where(
				and(
					eq(workoutPrograms.id, programId),
					eq(workoutPrograms.userId, userId),
					isNull(workoutPrograms.archivedAt)
				)
			)
			.get();
		if (!programRow) return null;
		return this.findById(programRow.id);
	}

	async programExerciseBelongsTo(programExerciseId: number, userId: number): Promise<boolean> {
		const row = await this.database
			.select({ id: programExercises.id })
			.from(programExercises)
			.innerJoin(workoutPrograms, eq(programExercises.programId, workoutPrograms.id))
			.where(
				and(
					eq(programExercises.id, programExerciseId),
					eq(workoutPrograms.userId, userId),
					// A deleted program takes no new sets; the ones already logged stay in history.
					isNull(workoutPrograms.archivedAt)
				)
			)
			.get();

		return row !== undefined;
	}

	/**
	 * Hides the program from the athlete for good while keeping the row, so the sets already logged
	 * against it keep their program title (tech.md §4, v14). False when there is nothing of theirs to
	 * delete: another user's program, a missing one, or one already deleted.
	 */
	async archiveForUser(programId: number, userId: number): Promise<boolean> {
		const row = await this.database
			.update(workoutPrograms)
			.set({ archivedAt: new Date() })
			.where(
				and(
					eq(workoutPrograms.id, programId),
					eq(workoutPrograms.userId, userId),
					isNull(workoutPrograms.archivedAt)
				)
			)
			.returning({ id: workoutPrograms.id })
			.get();

		return row !== undefined;
	}

	async listByUser(userId: number): Promise<WorkoutProgram[]> {
		const programRows = await this.database
			.select()
			.from(workoutPrograms)
			.where(and(eq(workoutPrograms.userId, userId), isNull(workoutPrograms.archivedAt)))
			.orderBy(desc(workoutPrograms.id))
			.all();

		const programs = await Promise.all(programRows.map((row) => this.findById(row.id)));
		return programs.filter((program): program is WorkoutProgram => program !== null);
	}
}
