import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { User } from '../domain/user';

export class UserRepository {
	constructor(private readonly database = db) {}

	findByTelegramId(telegramId: string): User | null {
		const row = this.database.select().from(users).where(eq(users.telegramId, telegramId)).get();
		return row ? new User(row) : null;
	}

	private createFromTelegram(telegramId: string, username: string | null): User {
		const row = this.database
			.insert(users)
			.values({ telegramId, username, createdAt: new Date() })
			.returning()
			.get();
		return new User(row);
	}

	findOrCreateByTelegram(telegramId: string, username: string | null): User {
		const existing = this.findByTelegramId(telegramId);
		if (existing) return existing;
		return this.createFromTelegram(telegramId, username);
	}
}
