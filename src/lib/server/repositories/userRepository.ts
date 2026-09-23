import { eq } from 'drizzle-orm';
import type { UpdateProfileInput } from '$lib/validation/schemas';
import { db } from '../db/client';
import { users } from '../db/schema';
import { User } from '../domain/user';

export class UserRepository {
	constructor(private readonly database = db) {}

	async findByTelegramId(telegramId: string): Promise<User | null> {
		const row = await this.database
			.select()
			.from(users)
			.where(eq(users.telegramId, telegramId))
			.get();
		return row ? new User(row) : null;
	}

	private async createFromTelegram(telegramId: string, username: string | null): Promise<User> {
		const row = await this.database
			.insert(users)
			.values({ telegramId, username, createdAt: new Date() })
			.returning()
			.get();
		return new User(row);
	}

	async findOrCreateByTelegram(telegramId: string, username: string | null): Promise<User> {
		const existing = await this.findByTelegramId(telegramId);
		if (existing) return existing;
		return this.createFromTelegram(telegramId, username);
	}

	async updateProfile(userId: number, profile: UpdateProfileInput): Promise<User | null> {
		const row = await this.database
			.update(users)
			.set({
				goal: profile.goal,
				level: profile.level,
				constraints: profile.constraints?.trim() || null
			})
			.where(eq(users.id, userId))
			.returning()
			.get();

		return row ? new User(row) : null;
	}
}
