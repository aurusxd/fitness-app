import { authFetch } from './telegram';
import type { ChatMessageDto, WorkoutProgramDto } from '$lib/types';

export type DraftRequestResult = { message: ChatMessageDto } | { error: string };

/** Asks the coach for a program draft, which arrives as a chat message rather than a saved program. */
export async function requestProgramDraft(): Promise<DraftRequestResult> {
	let response: Response;
	try {
		response = await authFetch('/api/trainer/draft', { method: 'POST' });
	} catch {
		return { error: 'Ошибка сети. Попробуй ещё раз.' };
	}

	const body = await response.json().catch(() => null);
	if (!response.ok || !body?.message) {
		return { error: body?.error ?? 'Не удалось собрать программу. Попробуй ещё раз.' };
	}

	return { message: body.message as ChatMessageDto };
}

export type DraftSaveResult =
	{ message: ChatMessageDto; program: WorkoutProgramDto } | { error: string };

/** Adds the draft attached to a chat message to the athlete's programs. */
export async function saveProgramDraft(messageId: number): Promise<DraftSaveResult> {
	let response: Response;
	try {
		response = await authFetch(`/api/trainer/messages/${messageId}/program`, { method: 'POST' });
	} catch {
		return { error: 'Ошибка сети. Попробуй ещё раз.' };
	}

	const body = await response.json().catch(() => null);
	if (!response.ok || !body?.message) {
		return { error: body?.error ?? 'Не удалось добавить программу. Попробуй ещё раз.' };
	}

	return { message: body.message as ChatMessageDto, program: body.program as WorkoutProgramDto };
}
