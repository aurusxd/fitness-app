import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { users } from '../db/schema';
import { ExerciseRepository } from '../repositories/exerciseRepository';
import { ProgramRepository } from '../repositories/programRepository';
import { WorkoutLogRepository } from '../repositories/workoutLogRepository';
import { ProgramExerciseNotFoundError, WorkoutLogService } from './workoutLogService';

describe('WorkoutLogService', () => {
	let service: WorkoutLogService;
	let programRepository: ProgramRepository;
	let exerciseRepository: ExerciseRepository;
	let userId: number;
	let otherUserId: number;
	let programId: number;
	let squatExerciseId: number;
	let plankExerciseId: number;

	beforeEach(async () => {
		const db = await createTestDb();
		programRepository = new ProgramRepository(db);
		exerciseRepository = new ExerciseRepository(db);
		service = new WorkoutLogService(new WorkoutLogRepository(db), programRepository);

		const [user, otherUser] = await Promise.all([
			db.insert(users).values({ telegramId: '1', createdAt: new Date() }).returning().get(),
			db.insert(users).values({ telegramId: '2', createdAt: new Date() }).returning().get()
		]);
		userId = user.id;
		otherUserId = otherUser.id;

		const squat = await exerciseRepository.findOrCreateByName('Squat');
		const plank = await exerciseRepository.findOrCreateByName('Plank');

		const program = await programRepository.create(userId, 'Leg Day', 'ai_generated', [
			{ exerciseId: squat.id, dayIndex: 0, orderIndex: 0, sets: 3, reps: '10' },
			{ exerciseId: plank.id, dayIndex: 0, orderIndex: 1, sets: 3, reps: '45s' }
		]);
		programId = program.id;
		squatExerciseId = program.days[0].exercises[0].id;
		plankExerciseId = program.days[0].exercises[1].id;
	});

	it('records what was actually performed, with the exercise and program named', async () => {
		const entry = await service.logSet(userId, {
			programExerciseId: squatExerciseId,
			setsDone: 4,
			repsDone: '8',
			weightKg: 60
		});

		expect(entry).toMatchObject({
			programExerciseId: squatExerciseId,
			programId,
			programTitle: 'Leg Day',
			exerciseName: 'Squat',
			setsDone: 4,
			repsDone: '8',
			weightKg: 60
		});
	});

	it('accepts a set without a weight', async () => {
		const entry = await service.logSet(userId, {
			programExerciseId: plankExerciseId,
			setsDone: 3,
			repsDone: '45s'
		});

		expect(entry.weightKg).toBeNull();
	});

	it('refuses to log against an exercise from another user’s program', async () => {
		await expect(
			service.logSet(otherUserId, {
				programExerciseId: squatExerciseId,
				setsDone: 3,
				repsDone: '10'
			})
		).rejects.toThrow(ProgramExerciseNotFoundError);

		expect(await service.historyForUser(otherUserId)).toEqual([]);
	});

	it('refuses to log against an exercise that does not exist', async () => {
		await expect(
			service.logSet(userId, { programExerciseId: 9999, setsDone: 3, repsDone: '10' })
		).rejects.toThrow(ProgramExerciseNotFoundError);
	});

	it('returns history newest first', async () => {
		await service.logSet(userId, {
			programExerciseId: squatExerciseId,
			setsDone: 3,
			repsDone: '10'
		});
		await service.logSet(userId, {
			programExerciseId: plankExerciseId,
			setsDone: 3,
			repsDone: '45s'
		});

		const history = await service.historyForUser(userId);

		expect(history.map((entry) => entry.exerciseName)).toEqual(['Plank', 'Squat']);
	});

	it('scopes history to the requesting user', async () => {
		await service.logSet(userId, {
			programExerciseId: squatExerciseId,
			setsDone: 3,
			repsDone: '10'
		});

		expect(await service.historyForUser(otherUserId)).toEqual([]);
	});

	it('narrows history to a single program', async () => {
		const otherProgram = await programRepository.create(userId, 'Upper Body', 'manual', [
			{
				exerciseId: (await exerciseRepository.findOrCreateByName('Push-Up')).id,
				dayIndex: 1,
				orderIndex: 0,
				sets: 3,
				reps: '12'
			}
		]);

		await service.logSet(userId, {
			programExerciseId: squatExerciseId,
			setsDone: 3,
			repsDone: '10'
		});
		await service.logSet(userId, {
			programExerciseId: otherProgram.days[0].exercises[0].id,
			setsDone: 3,
			repsDone: '12'
		});

		const history = await service.historyForProgram(userId, programId);

		expect(history).toHaveLength(1);
		expect(history[0].exerciseName).toBe('Squat');
	});
});
