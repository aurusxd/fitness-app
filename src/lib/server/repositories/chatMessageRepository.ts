import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { ChatMessageDto } from '$lib/types';
import type { GeneratedProgram } from '$lib/validation/schemas';
import { db } from '../db/client';
import { aiChatMessages, workoutPrograms } from '../db/schema';

export type ChatMessageRow = typeof aiChatMessages.$inferSelect;
export type ChatMessageRole = ChatMessageRow['role'];

export function toChatMessageDto(row: ChatMessageRow): ChatMessageDto {
	return {
		id: row.id,
		role: row.role,
		content: row.content,
		createdAt: row.createdAt.toISOString(),
		programDraft: row.programDraft ?? null,
		savedProgramId: row.savedProgramId ?? null
	};
}

/** A draft whose program was deleted counts as not added, so the athlete can add it again (tech.md §4, v15). */
function withLiveSavedProgram(row: {
	message: ChatMessageRow;
	savedProgramArchivedAt: Date | null;
}): ChatMessageRow {
	return row.savedProgramArchivedAt ? { ...row.message, savedProgramId: null } : row.message;
}

export class ChatMessageRepository {
	constructor(private readonly database = db) {}

	async append(
		userId: number,
		role: ChatMessageRole,
		content: string,
		programDraft: GeneratedProgram | null = null
	): Promise<ChatMessageRow> {
		return this.database
			.insert(aiChatMessages)
			.values({ userId, role, content, programDraft, createdAt: new Date() })
			.returning()
			.get();
	}

	/** Most recent messages for a user, oldest first, limited to `limit`. */
	async recentHistory(userId: number, limit: number): Promise<ChatMessageRow[]> {
		const rows = await this.selectWithSavedProgram()
			.where(eq(aiChatMessages.userId, userId))
			.orderBy(desc(aiChatMessages.id))
			.limit(limit)
			.all();

		return rows.map(withLiveSavedProgram).reverse();
	}

	/** Returns the message only if it belongs to `userId`. */
	async findForUser(messageId: number, userId: number): Promise<ChatMessageRow | null> {
		const row = await this.selectWithSavedProgram()
			.where(and(eq(aiChatMessages.id, messageId), eq(aiChatMessages.userId, userId)))
			.get();

		return row ? withLiveSavedProgram(row) : null;
	}

	async markDraftSaved(messageId: number, programId: number): Promise<ChatMessageRow> {
		return this.database
			.update(aiChatMessages)
			.set({ savedProgramId: programId })
			.where(eq(aiChatMessages.id, messageId))
			.returning()
			.get();
	}

	async countUserMessagesSince(userId: number, since: Date): Promise<number> {
		const row = await this.database
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

	private selectWithSavedProgram() {
		return this.database
			.select({ message: aiChatMessages, savedProgramArchivedAt: workoutPrograms.archivedAt })
			.from(aiChatMessages)
			.leftJoin(workoutPrograms, eq(aiChatMessages.savedProgramId, workoutPrograms.id));
	}
}
