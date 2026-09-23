import type { users } from '../db/schema';

export type UserRow = typeof users.$inferSelect;

export class User {
	constructor(private readonly row: UserRow) {}

	get id(): number {
		return this.row.id;
	}

	get telegramId(): string {
		return this.row.telegramId;
	}

	get username(): string | null {
		return this.row.username;
	}

	get goal(): UserRow['goal'] {
		return this.row.goal;
	}

	get level(): UserRow['level'] {
		return this.row.level;
	}

	get constraints(): string | null {
		return this.row.constraints;
	}

	hasCompleteProfile(): boolean {
		return this.goal !== null && this.level !== null;
	}
}
