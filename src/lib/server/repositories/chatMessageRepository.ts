import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { ChatMessageDto } from '$lib/types';
import { db } from '../db/client';
import { aiChatMessages } from '../db/schema';

export type ChatMessageRow = typeof aiChatMessages.$inferSelect;
export type ChatMessageRole = ChatMessageRow['role'];

export function toChatMessageDto(row: ChatMessageRow): ChatMessageDto {
	return {
		id: row.id,
		role: row.role,
		content: row.content,
		createdAt: row.createdAt.toISOString()
	};
}

export class ChatMessageRepository {
	constructor(private readonly database = db) {}

	append(userId: number, role: ChatMessageRole, content: string): ChatMessageRow {
		return this.database
			.insert(aiChatMessages)
			.values({ userId, role, content, createdAt: new Date() })
			.returning()
			.get();
	}

	/** Most recent messages for a user, oldest first, limited to `limit`. */
	recentHistory(userId: number, limit: number): ChatMessageRow[] {
		const rows = this.database
			.select()
			.from(aiChatMessages)
			.where(eq(aiChatMessages.userId, userId))
			.orderBy(desc(aiChatMessages.id))
			.limit(limit)
			.all();

		return rows.reverse();
	}

	countUserMessagesSince(userId: number, since: Date): number {
		const row = this.database
			.select({ count: sql<number>`count(*)` })
			.from(aiChatMessages)
			.where(
				and(
					eq(aiChatMessages.userId, userId),
					eq(aiChatMessages.role, 'user'),
					gte(aiChatMessages.createdAt, since)
				)
			)
			.get();

		return row?.count ?? 0;
	}
}
