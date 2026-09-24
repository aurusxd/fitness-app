import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { exercises } from '../db/schema';
import { ExerciseRepository, NO_EQUIPMENT } from './exerciseRepository';

describe('ExerciseRepository', () => {
	let db: Awaited<ReturnType<typeof createTestDb>>;
	let repository: ExerciseRepository;

	beforeEach(async () => {
		db = await createTestDb();
		repository = new ExerciseRepository(db);
	});

	describe('name matching', () => {
		it('creates a new exercise with an unspecified muscle group when none exists', async () => {
			const exercise = await repository.findOrCreateByName('Push-Up');

			expect(exercise.name).toBe('Push-Up');
			expect(exercise.muscleGroup).toBe('unspecified');
		});

		it('matches an existing exercise case-insensitively and trims whitespace', async () => {
			const created = await repository.findOrCreateByName('Push-Up');

			const found = await repository.findByNormalizedName('  push-up  ');

			expect(found?.id).toBe(created.id);
		});

		it('does not duplicate an exercise on a repeated name', async () => {
			const first = await repository.findOrCreateByName('Squat');
			const second = await repository.findOrCreateByName('squat');

			expect(second.id).toBe(first.id);
		});

		it('matches a Russian name whatever case the model writes it in', async () => {
			const created = await repository.findOrCreateByName('Приседания со штангой');

			const second = await repository.findOrCreateByName('приседания СО ШТАНГОЙ');

			expect(second.id).toBe(created.id);
		});

		it('returns null from findByNormalizedName when nothing matches', async () => {
			expect(await repository.findByNormalizedName('unknown exercise')).toBeNull();
		});

		it('drops the coaching note the AI appends, so the library keeps one entry per movement', async () => {
			const plain = await repository.findOrCreateByName('Goblet Squat');
			const annotated = await repository.findOrCreateByName(
				'Goblet Squat (limited range, pain-free)'
			);

			expect(annotated.id).toBe(plain.id);
			expect(annotated.name).toBe('Goblet Squat');
		});

		it('stores an annotated name without its note when the movement is new', async () => {
			const created = await repository.findOrCreateByName('Leg Press (pain-free range, light)');

			expect(created.name).toBe('Leg Press');
		});
	});

	describe('library listing', () => {
		beforeEach(async () => {
			await db.insert(exercises).values([
				{ name: 'Barbell Squat', muscleGroup: 'legs', equipment: 'barbell' },
				{ name: 'Bodyweight Squat', muscleGroup: 'legs', equipment: null },
				{ name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
				{ name: 'Plank', muscleGroup: 'core', equipment: null }
			]);
		});

		it('lists every exercise alphabetically when unfiltered', async () => {
			const list = await repository.list();

			expect(list.map((exercise) => exercise.name)).toEqual([
				'Barbell Squat',
				'Bench Press',
				'Bodyweight Squat',
				'Plank'
			]);
		});

		it('filters by muscle group', async () => {
			const list = await repository.list({ muscleGroup: 'legs' });

			expect(list.map((exercise) => exercise.name)).toEqual(['Barbell Squat', 'Bodyweight Squat']);
		});

		it('filters by equipment', async () => {
			const list = await repository.list({ equipment: 'barbell' });

			expect(list.map((exercise) => exercise.name)).toEqual(['Barbell Squat', 'Bench Press']);
		});

		it('filters down to bodyweight exercises, which have no equipment', async () => {
			const list = await repository.list({ equipment: NO_EQUIPMENT });

			expect(list.map((exercise) => exercise.name)).toEqual(['Bodyweight Squat', 'Plank']);
			expect(list.every((exercise) => exercise.isBodyweight)).toBe(true);
		});

		it('searches by name, case-insensitively and partially', async () => {
			const list = await repository.list({ search: 'squat' });

			expect(list.map((exercise) => exercise.name)).toEqual(['Barbell Squat', 'Bodyweight Squat']);
		});

		it('searches a Russian name typed in lower case, which SQLite cannot fold itself', async () => {
			await db.insert(exercises).values({ name: 'Становая тяга', muscleGroup: 'back' });

			const list = await repository.list({ search: 'становая' });

			expect(list.map((exercise) => exercise.name)).toEqual(['Становая тяга']);
		});

		it('combines filters', async () => {
			const list = await repository.list({ muscleGroup: 'legs', equipment: NO_EQUIPMENT });

			expect(list.map((exercise) => exercise.name)).toEqual(['Bodyweight Squat']);
		});

		it('offers the muscle groups and equipment actually present, without nulls', async () => {
			expect(await repository.distinctMuscleGroups()).toEqual(['chest', 'core', 'legs']);
			expect(await repository.distinctEquipment()).toEqual(['barbell']);
		});
	});

	describe('categorisation', () => {
		it('replaces the AI placeholder once an exercise is categorised', async () => {
			const created = await repository.findOrCreateByName('Face Pull');
			expect((await repository.findById(created.id))?.needsCategorisation).toBe(true);

			const updated = await repository.updateCategorisation(created.id, {
				muscleGroup: 'shoulders',
				equipment: 'cable machine'
			});

			expect(updated?.muscleGroup).toBe('shoulders');
			expect(updated?.equipment).toBe('cable machine');
			expect(updated?.needsCategorisation).toBe(false);
		});

		it('stores an empty equipment value as bodyweight', async () => {
			const created = await repository.findOrCreateByName('Burpee');

			const updated = await repository.updateCategorisation(created.id, {
				muscleGroup: 'full_body',
				equipment: ''
			});

			expect(updated?.equipment).toBeNull();
			expect(updated?.isBodyweight).toBe(true);
		});

		it('returns null when the exercise does not exist', async () => {
			expect(
				await repository.updateCategorisation(9999, { muscleGroup: 'legs', equipment: null })
			).toBeNull();
		});
	});
});
