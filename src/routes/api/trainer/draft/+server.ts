import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	AiTrainerService,
	AiTrainerError,
	InvalidAiResponseError
} from '$lib/server/services/aiTrainerService';
import { DeepseekClient } from '$lib/server/external/deepseekClient';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

/** "Собрать программу" in the chat header: the draft lands in the chat instead of the programs list (tech.md §5, v15). */
export const POST: RequestHandler = async ({ locals }) => {
	const { goal, level, constraints } = locals.user;

	if (!goal || !level) {
		return json(
			{ error: 'Заполни профиль (цель и уровень), прежде чем собирать программу.' },
			{ status: 400 }
		);
	}

	const aiClient = new DeepseekClient(config.deepseekApiKey, config.deepseekBaseUrl);
	const aiTrainerService = new AiTrainerService(aiClient);

	try {
		const message = await aiTrainerService.draftProgram(locals.user.id, {
			goal,
			level,
			constraints
		});
		return json({ message }, { status: 201 });
	} catch (error) {
		if (error instanceof InvalidAiResponseError || error instanceof AiTrainerError) {
			logger.error({ err: error }, 'program draft generation failed');
			return json({ error: error.message }, { status: 502 });
		}
		throw error;
	}
};
