import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { GeneratedProgram } from '../../validation/schemas';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	telegramId: text('telegram_id').notNull().unique(),
	username: text('username'),
	goal: text('goal', { enum: ['gain', 'lose', 'maintain'] }),
	level: text('level', { enum: ['beginner', 'intermediate', 'advanced'] }),
	constraints: text('constraints'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const exercises = sqliteTable('exercises', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	muscleGroup: text('muscle_group').notNull(),
	equipment: text('equipment'),
	videoUrl: text('video_url'),
	description: text('description')
});

export const workoutPrograms = sqliteTable(
	'workout_programs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		title: text('title').notNull(),
		source: text('source', { enum: ['ai_generated', 'manual'] }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		/** Set when the athlete deletes the program; the row stays so logged history keeps its title (v14). */
		archivedAt: integer('archived_at', { mode: 'timestamp' })
	},
	(table) => [index('workout_programs_user_id_idx').on(table.userId)]
);

export const programExercises = sqliteTable(
	'program_exercises',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		programId: integer('program_id')
			.notNull()
			.references(() => workoutPrograms.id),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercises.id),
		dayIndex: integer('day_index').notNull(),
		orderIndex: integer('order_index').notNull(),
		sets: integer('sets').notNull(),
		reps: text('reps').notNull(),
		restSeconds: integer('rest_seconds')
	},
	(table) => [index('program_exercises_program_id_idx').on(table.programId)]
);

export const workoutLogs = sqliteTable(
	'workout_logs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		programExerciseId: integer('program_exercise_id')
			.notNull()
			.references(() => programExercises.id),
		performedAt: integer('performed_at', { mode: 'timestamp' }).notNull(),
		setsDone: integer('sets_done').notNull(),
		repsDone: text('reps_done').notNull(),
		weightKg: real('weight_kg')
	},
	(table) => [index('workout_logs_user_id_idx').on(table.userId)]
);

export const aiChatMessages = sqliteTable(
	'ai_chat_messages',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		role: text('role', { enum: ['user', 'assistant'] }).notNull(),
		content: text('content').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		// A program the coach attached to this reply; it reaches the programs list only when added (tech.md §4, v15).
		programDraft: text('program_draft', { mode: 'json' }).$type<GeneratedProgram>(),
		savedProgramId: integer('saved_program_id').references(() => workoutPrograms.id)
	},
	(table) => [index('ai_chat_messages_user_id_idx').on(table.userId)]
);
