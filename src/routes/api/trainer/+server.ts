import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendChatMessageSchema } from '$lib/validation/schemas';
import {
	AiTrainerService,
	AiTrainerError,
	RateLimitExceededError
} from '$lib/server/services/aiTrainerService';
import { DeepseekClient } from '$lib/server/external/deepseekClient';
import { config } from '$lib/server/config';
import { logger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const parsed = sendChatMessageSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Неверный запрос' }, { status: 400 });
	}

	const aiClient = new DeepseekClient(config.deepseekApiKey, config.deepseekBaseUrl);
	const aiTrainerService = new AiTrainerService(aiClient);

	try {
		const message = await aiTrainerService.sendMessage(locals.user.id, parsed.data.content);
		return json({ message });
	} catch (error) {
		if (error instanceof RateLimitExceededError) {
			return json({ error: error.message }, { status: 429 });
		}
		if (error instanceof AiTrainerError) {
			logger.error({ err: error }, 'ai trainer request failed');
			return json({ error: error.message }, { status: 502 });
		}
		throw error;
	}
};
