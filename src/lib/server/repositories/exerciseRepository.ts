import { and, asc, eq, isNotNull, isNull, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { exercises } from '../db/schema';
import { Exercise, UNSPECIFIED_MUSCLE_GROUP, type ExerciseRow } from '../domain/exercise';

export type { ExerciseRow };

/** Filter value standing for "no equipment needed", since that is stored as NULL. */
export const NO_EQUIPMENT = 'none';

export interface ExerciseFilter {
	muscleGroup?: string;
	equipment?: string;
	search?: string;
}

/**
 * The AI annotates names it considers risky for the athlete ("Goblet Squat (light, pain-free)").
 * Prompting alone does not stop it, and the annotation is a coaching note rather than part of the
 * movement's name, so it is stripped before the name reaches the library.
 */
export function canonicalExerciseName(name: string): string {
	const stripped = name
		.replace(/\([^)]*\)/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	return stripped || name.trim();
}

/**
 * SQLite's `lower()` folds ASCII only, so «Приседания» and «приседания» compare as different
 * strings and the library would collect a row per capitalisation the model happens to use.
 * Matching therefore happens in JS over the library table, which is a curated few hundred rows;
 * a stored normalised column with an index is the answer if it ever outgrows that.
 */
function normalizedName(name: string): string {
	return name.trim().toLowerCase();
}

export class ExerciseRepository {
	constructor(private readonly database = db) {}

	async findByNormalizedName(name: string): Promise<ExerciseRow | null> {
		const normalized = normalizedName(name);
		const rows = await this.database.select().from(exercises).all();

		return rows.find((row) => normalizedName(row.name) === normalized) ?? null;
	}

	private async create(name: string): Promise<ExerciseRow> {
		return this.database
			.insert(exercises)
			.values({ name: name.trim(), muscleGroup: UNSPECIFIED_MUSCLE_GROUP })
			.returning()
			.get();
	}

	async findOrCreateByName(name: string): Promise<ExerciseRow> {
		const canonical = canonicalExerciseName(name);
		const existing = await this.findByNormalizedName(canonical);
		if (existing) return existing;
		return this.create(canonical);
	}

	async findById(id: number): Promise<Exercise | null> {
		const row = await this.database.select().from(exercises).where(eq(exercises.id, id)).get();
		return row ? new Exercise(row) : null;
	}

	async list(filter: ExerciseFilter = {}): Promise<Exercise[]> {
		const conditions: SQL[] = [];

		if (filter.muscleGroup) {
			conditions.push(eq(exercises.muscleGroup, filter.muscleGroup));
		}

		if (filter.equipment === NO_EQUIPMENT) {
			conditions.push(isNull(exercises.equipment));
		} else if (filter.equipment) {
			conditions.push(eq(exercises.equipment, filter.equipment));
		}

		const rows = await this.database
			.select()
			.from(exercises)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(asc(exercises.name))
			.all();

		const search = filter.search ? normalizedName(filter.search) : undefined;
		const matched = search ? rows.filter((row) => normalizedName(row.name).includes(search)) : rows;

		return matched.map((row) => new Exercise(row));
	}

	async distinctMuscleGroups(): Promise<string[]> {
		const rows = await this.database
			.selectDistinct({ muscleGroup: exercises.muscleGroup })
			.from(exercises)
			.orderBy(asc(exercises.muscleGroup))
			.all();

		return rows.map((row) => row.muscleGroup);
	}

	async distinctEquipment(): Promise<string[]> {
		const rows = await this.database
			.selectDistinct({ equipment: exercises.equipment })
			.from(exercises)
			.where(isNotNull(exercises.equipment))
			.orderBy(asc(exercises.equipment))
			.all();

		return rows.map((row) => row.equipment).filter((value): value is string => value !== null);
	}

	async updateCategorisation(
		id: number,
		categorisation: { muscleGroup: string; equipment: string | null }
	): Promise<Exercise | null> {
		const row = await this.database
			.update(exercises)
			.set({
				muscleGroup: categorisation.muscleGroup.trim(),
				equipment: categorisation.equipment?.trim() || null
			})
			.where(eq(exercises.id, id))
			.returning()
			.get();

		return row ? new Exercise(row) : null;
	}
}
