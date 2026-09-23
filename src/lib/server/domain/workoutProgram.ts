import type { workoutPrograms, programExercises } from '../db/schema';

export type WorkoutProgramRow = typeof workoutPrograms.$inferSelect;
export type ProgramExerciseRow = typeof programExercises.$inferSelect;

export interface ProgramExerciseWithName extends ProgramExerciseRow {
	exerciseName: string;
}

export class WorkoutProgram {
	constructor(
		private readonly row: WorkoutProgramRow,
		private readonly exerciseRows: ProgramExerciseWithName[]
	) {}

	get id(): number {
		return this.row.id;
	}

	get title(): string {
		return this.row.title;
	}

	get source(): WorkoutProgramRow['source'] {
		return this.row.source;
	}

	get createdAt(): Date {
		return this.row.createdAt;
	}

	get exerciseCount(): number {
		return this.exerciseRows.length;
	}

	/** Exercises grouped by day, days and within-day order ascending. */
	get days(): { dayIndex: number; exercises: ProgramExerciseWithName[] }[] {
		const byDay = new Map<number, ProgramExerciseWithName[]>();
		for (const exercise of this.exerciseRows) {
			const dayExercises = byDay.get(exercise.dayIndex) ?? [];
			dayExercises.push(exercise);
			byDay.set(exercise.dayIndex, dayExercises);
		}

		return [...byDay.entries()]
			.sort(([a], [b]) => a - b)
			.map(([dayIndex, exercises]) => ({
				dayIndex,
				exercises: [...exercises].sort((a, b) => a.orderIndex - b.orderIndex)
			}));
	}
}
