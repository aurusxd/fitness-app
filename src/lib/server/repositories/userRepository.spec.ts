import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { UserRepository } from './userRepository';

function createTestDb() {
	const sqlite = new Database(':memory:');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}

describe('UserRepository', () => {
	let repository: UserRepository;

	beforeEach(() => {
		repository = new UserRepository(createTestDb());
	});

	it('creates a new user on first sight of a telegramId', () => {
		const user = repository.findOrCreateByTelegram('42', 'olivia');

		expect(user.telegramId).toBe('42');
		expect(user.username).toBe('olivia');
		expect(user.hasCompleteProfile()).toBe(false);
	});

	it('returns the existing user on a repeated telegramId instead of duplicating', () => {
		const first = repository.findOrCreateByTelegram('42', 'olivia');
		const second = repository.findOrCreateByTelegram('42', 'olivia');

		expect(second.id).toBe(first.id);
	});

	it('returns null from findByTelegramId when no user exists', () => {
		expect(repository.findByTelegramId('unknown')).toBeNull();
	});
});
