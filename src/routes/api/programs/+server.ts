import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	AiTrainerService,
	AiTrainerError,
	InvalidAiResponseError
} from '$lib/server/services/aiTrainerService';
import { toWorkoutProgramDto } from '$lib/server/repositories/programRepository';
import { DeepseekClient } from '$lib/server/external/deepseekClient';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ locals }) => {
	const { goal, level, constraints } = locals.user;

	if (!goal || !level) {
		return json(
			{ error: 'Complete your profile (goal and level) before generating a program.' },
			{ status: 400 }
		);
	}

	const aiClient = new DeepseekClient(config.deepseekApiKey);
	const aiTrainerService = new AiTrainerService(aiClient);

	try {
		const program = await aiTrainerService.generateProgram(locals.user.id, {
			goal,
			level,
			constraints
		});
		return json({ program: toWorkoutProgramDto(program) }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidAiResponseError || error instanceof AiTrainerError) {
			logger.error({ error }, 'program generation failed');
			return json({ error: error.message }, { status: 502 });
		}
		throw error;
	}
};
