import { z } from 'zod';

export const sendChatMessageSchema = z.object({
	content: z.string().trim().min(1).max(2000)
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

/** Fixed JSON contract for the AI trainer's program generation response (tech.md §5). */
export const generatedProgramSchema = z.object({
	title: z.string().trim().min(1).max(200),
	days: z
		.array(
			z.object({
				dayIndex: z.number().int().min(0).max(6),
				exercises: z
					.array(
						z.object({
							exerciseName: z.string().trim().min(1).max(200),
							sets: z.number().int().positive().max(20),
							reps: z.string().trim().min(1).max(50),
							restSeconds: z.number().int().positive().max(1800).optional()
						})
					)
					.min(1)
			})
		)
		.min(1)
});

export type GeneratedProgram = z.infer<typeof generatedProgramSchema>;

export const logWorkoutSetSchema = z.object({
	programExerciseId: z.number().int().positive(),
	setsDone: z.number().int().positive().max(20),
	repsDone: z.string().trim().min(1).max(50),
	weightKg: z.number().positive().max(1000).optional()
});

export type LogWorkoutSetInput = z.infer<typeof logWorkoutSetSchema>;
