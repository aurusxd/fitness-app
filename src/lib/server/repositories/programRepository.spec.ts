import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { users } from '../db/schema';
import { ExerciseRepository } from './exerciseRepository';
import { ProgramRepository } from './programRepository';

describe('ProgramRepository', () => {
	let db: Awaited<ReturnType<typeof createTestDb>>;
	let programRepository: ProgramRepository;
	let exerciseRepository: ExerciseRepository;
	let userId: number;
	let otherUserId: number;

	beforeEach(async () => {
		db = await createTestDb();
		programRepository = new ProgramRepository(db);
		exerciseRepository = new ExerciseRepository(db);

		const [user, otherUser] = await Promise.all([
			db.insert(users).values({ telegramId: '1', createdAt: new Date() }).returning().get(),
			db.insert(users).values({ telegramId: '2', createdAt: new Date() }).returning().get()
		]);
		userId = user.id;
		otherUserId = otherUser.id;
	});

	it('creates a program with its exercises and reloads it with exercise names grouped by day', async () => {
		const squat = await exerciseRepository.findOrCreateByName('Squat');
		const lunge = await exerciseRepository.findOrCreateByName('Lunge');

		const program = await programRepository.create(userId, 'Leg Day', 'ai_generated', [
			{ exerciseId: squat.id, dayIndex: 0, orderIndex: 0, sets: 3, reps: '10' },
			{ exerciseId: lunge.id, dayIndex: 0, orderIndex: 1, sets: 3, reps: '12' }
		]);

		expect(program.title).toBe('Leg Day');
		expect(program.days).toEqual([
			{
				dayIndex: 0,
				exercises: [
					expect.objectContaining({ exerciseName: 'Squat', orderIndex: 0 }),
					expect.objectContaining({ exerciseName: 'Lunge', orderIndex: 1 })
				]
			}
		]);
	});

	it('only returns a program via findByIdForUser when it belongs to that user', async () => {
		const program = await programRepository.create(userId, 'Leg Day', 'manual', []);

		expect(await programRepository.findByIdForUser(program.id, userId)).not.toBeNull();
		expect(await programRepository.findByIdForUser(program.id, otherUserId)).toBeNull();
	});

	it('lists programs for a user, most recent first', async () => {
		await programRepository.create(userId, 'First', 'manual', []);
		await programRepository.create(userId, 'Second', 'manual', []);

		const list = await programRepository.listByUser(userId);

		expect(list.map((p) => p.title)).toEqual(['Second', 'First']);
	});
});
