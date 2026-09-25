import { authFetch } from './telegram';
import type { WorkoutProgramDto } from '$lib/types';

export type ProgramRequestResult = { program: WorkoutProgramDto } | { error: string };

/**
 * Asks the AI trainer for a program built from the saved profile. Generation can take tens of
 * seconds, and a response cut short upstream may not be JSON at all, so every failure comes back
 * as a message the screen can show rather than as a thrown error.
 */
export async function requestProgram(): Promise<ProgramRequestResult> {
	let response: Response;
	try {
		response = await authFetch('/api/programs', { method: 'POST' });
	} catch {
		return { error: 'Ошибка сети. Попробуй ещё раз.' };
	}

	const body = await response.json().catch(() => null);
	if (!response.ok || !body?.program) {
		return { error: body?.error ?? 'Не удалось собрать программу. Попробуй ещё раз.' };
	}

	return { program: body.program as WorkoutProgramDto };
}

export type ProgramDeleteResult = { ok: true } | { error: string };

/** Deletes the program for this athlete; the sets already logged against it stay in history. */
export async function deleteProgram(programId: number): Promise<ProgramDeleteResult> {
	let response: Response;
	try {
		response = await authFetch(`/api/programs/${programId}`, { method: 'DELETE' });
	} catch {
		return { error: 'Ошибка сети. Попробуй ещё раз.' };
	}

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		return { error: body?.error ?? 'Не удалось удалить программу. Попробуй ещё раз.' };
	}

	return { ok: true };
}
