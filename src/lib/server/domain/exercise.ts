import type { ExerciseDto } from '$lib/types';
import type { exercises } from '../db/schema';

export type ExerciseRow = typeof exercises.$inferSelect;

/** Placeholder muscle group for exercises the AI introduced without categorisation (tech.md §5, v4). */
export const UNSPECIFIED_MUSCLE_GROUP = 'unspecified';

export class Exercise {
	constructor(private readonly row: ExerciseRow) {}

	get id(): number {
		return this.row.id;
	}

	get name(): string {
		return this.row.name;
	}

	get muscleGroup(): string {
		return this.row.muscleGroup;
	}

	get equipment(): string | null {
		return this.row.equipment;
	}

	get videoUrl(): string | null {
		return this.row.videoUrl;
	}

	get description(): string | null {
		return this.row.description;
	}

	get isBodyweight(): boolean {
		return this.row.equipment === null;
	}

	/** True while the exercise still carries the AI placeholder and needs manual categorisation. */
	get needsCategorisation(): boolean {
		return this.row.muscleGroup === UNSPECIFIED_MUSCLE_GROUP;
	}

	toDto(): ExerciseDto {
		return {
			id: this.id,
			name: this.name,
			muscleGroup: this.muscleGroup,
			equipment: this.equipment,
			videoUrl: this.videoUrl,
			description: this.description,
			isBodyweight: this.isBodyweight,
			needsCategorisation: this.needsCategorisation
		};
	}
}
