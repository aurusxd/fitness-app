import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { exercises } from '../db/schema';

export type ExerciseRow = typeof exercises.$inferSelect;

/** Muscle group for exercises auto-created from an AI response, which carries no muscle group (tech.md §5, v4). */
const UNSPECIFIED_MUSCLE_GROUP = 'unspecified';

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
}
