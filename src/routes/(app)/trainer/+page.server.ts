import type { PageServerLoad } from './$types';
import {
	ChatMessageRepository,
	toChatMessageDto
} from '$lib/server/repositories/chatMessageRepository';

const HISTORY_LIMIT = 20;

export const load: PageServerLoad = async ({ locals }) => {
	const chatMessageRepository = new ChatMessageRepository();
	const history = await chatMessageRepository.recentHistory(locals.user.id, HISTORY_LIMIT);

	return {
		messages: history.map(toChatMessageDto)
	};
};
