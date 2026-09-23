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
});
