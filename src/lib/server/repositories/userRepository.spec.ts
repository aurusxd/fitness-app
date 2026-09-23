import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../db/createTestDb';
import { UserRepository } from './userRepository';

describe('UserRepository', () => {
	let repository: UserRepository;

	beforeEach(async () => {
		repository = new UserRepository(await createTestDb());
	});

	it('creates a new user on first sight of a telegramId', async () => {
		const user = await repository.findOrCreateByTelegram('42', 'olivia');

		expect(user.telegramId).toBe('42');
		expect(user.username).toBe('olivia');
		expect(user.hasCompleteProfile()).toBe(false);
	});

	it('returns the existing user on a repeated telegramId instead of duplicating', async () => {
		const first = await repository.findOrCreateByTelegram('42', 'olivia');
		const second = await repository.findOrCreateByTelegram('42', 'olivia');

		expect(second.id).toBe(first.id);
	});

	it('returns null from findByTelegramId when no user exists', async () => {
		expect(await repository.findByTelegramId('unknown')).toBeNull();
	});

	describe('updateProfile', () => {
		it('completes the profile, which is what unlocks program generation', async () => {
			const user = await repository.findOrCreateByTelegram('42', 'olivia');
			expect(user.hasCompleteProfile()).toBe(false);

			const updated = await repository.updateProfile(user.id, {
				goal: 'lose',
				level: 'beginner',
				constraints: 'Sensitive left knee'
			});

			expect(updated?.goal).toBe('lose');
			expect(updated?.level).toBe('beginner');
			expect(updated?.constraints).toBe('Sensitive left knee');
			expect(updated?.hasCompleteProfile()).toBe(true);
		});

		it('stores blank constraints as null rather than an empty string', async () => {
			const user = await repository.findOrCreateByTelegram('42', 'olivia');

			const updated = await repository.updateProfile(user.id, {
				goal: 'gain',
				level: 'advanced',
				constraints: '   '
			});

			expect(updated?.constraints).toBeNull();
		});

		it('persists the change for the next lookup', async () => {
			const user = await repository.findOrCreateByTelegram('42', 'olivia');
			await repository.updateProfile(user.id, {
				goal: 'maintain',
				level: 'intermediate',
				constraints: null
			});

			const reloaded = await repository.findByTelegramId('42');

			expect(reloaded?.goal).toBe('maintain');
			expect(reloaded?.level).toBe('intermediate');
		});

		it('returns null when the user does not exist', async () => {
			expect(
				await repository.updateProfile(9999, { goal: 'lose', level: 'beginner', constraints: null })
			).toBeNull();
		});
	});
});
