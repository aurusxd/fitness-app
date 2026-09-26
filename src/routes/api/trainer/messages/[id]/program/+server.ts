import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	AiTrainerService,
	DraftAlreadySavedError,
	DraftNotFoundError,
	InvalidAiResponseError
} from '$lib/server/services/aiTrainerService';
import { toWorkoutProgramDto } from '$lib/server/repositories/programRepository';
import { DeepseekClient } from '$lib/server/external/deepseekClient';
import { config } from '$lib/server/config';

/** "Добавить в программы" on a draft card in the chat (tech.md §5, v15). */
export const POST: RequestHandler = async ({ params, locals }) => {
	const messageId = Number(params.id);
	if (!Number.isInteger(messageId)) {
		return json({ error: 'Черновик программы не найден' }, { status: 404 });
	}

	// Saving a draft never calls the model, but the service is built around its client.
	const aiClient = new DeepseekClient(config.deepseekApiKey, config.deepseekBaseUrl);
	const aiTrainerService = new AiTrainerService(aiClient);

	try {
		const { program, message } = await aiTrainerService.saveDraft(locals.user.id, messageId);
		return json({ program: toWorkoutProgramDto(program), message }, { status: 201 });
	} catch (error) {
		if (error instanceof DraftNotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		if (error instanceof DraftAlreadySavedError) {
			return json({ error: error.message }, { status: 409 });
		}
		if (error instanceof InvalidAiResponseError) {
			return json({ error: error.message }, { status: 422 });
		}
		throw error;
	}
};
