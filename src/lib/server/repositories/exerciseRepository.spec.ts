import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { ExerciseRepository } from './exerciseRepository';

describe('ExerciseRepository', () => {
	let repository: ExerciseRepository;

	beforeEach(async () => {
		repository = new ExerciseRepository(await createTestDb());
	});

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

	it('returns null from findByNormalizedName when nothing matches', async () => {
		expect(await repository.findByNormalizedName('unknown exercise')).toBeNull();
	});
});
