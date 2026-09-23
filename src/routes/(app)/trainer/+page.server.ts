import type { PageServerLoad } from './$types';
import {
	ChatMessageRepository,
	toChatMessageDto
} from '$lib/server/repositories/chatMessageRepository';

const HISTORY_LIMIT = 20;

export const load: PageServerLoad = ({ locals }) => {
	const chatMessageRepository = new ChatMessageRepository();
	const history = chatMessageRepository.recentHistory(locals.user.id, HISTORY_LIMIT);

	return {
		messages: history.map(toChatMessageDto)
	};
};
