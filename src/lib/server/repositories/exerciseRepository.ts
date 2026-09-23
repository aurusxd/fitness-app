import { and, asc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
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

export class ExerciseRepository {
	constructor(private readonly database = db) {}

	async findByNormalizedName(name: string): Promise<ExerciseRow | null> {
		const normalized = name.trim().toLowerCase();
		const row = await this.database
			.select()
			.from(exercises)
			.where(sql`lower(trim(${exercises.name})) = ${normalized}`)
			.get();
		return row ?? null;
	}

	private async create(name: string): Promise<ExerciseRow> {
		return this.database
			.insert(exercises)
			.values({ name: name.trim(), muscleGroup: UNSPECIFIED_MUSCLE_GROUP })
			.returning()
			.get();
	}

	async findOrCreateByName(name: string): Promise<ExerciseRow> {
		const existing = await this.findByNormalizedName(name);
		if (existing) return existing;
		return this.create(name);
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

		const search = filter.search?.trim().toLowerCase();
		if (search) {
			conditions.push(sql`lower(${exercises.name}) like ${`%${search}%`}`);
		}

		const rows = await this.database
			.select()
			.from(exercises)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(asc(exercises.name))
			.all();

		return rows.map((row) => new Exercise(row));
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
