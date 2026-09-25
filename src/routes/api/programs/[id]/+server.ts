import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProgramService } from '$lib/server/services/programService';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const programId = Number(params.id);
	if (!Number.isInteger(programId)) {
		return json({ error: 'Программа не найдена' }, { status: 404 });
	}

	const programService = new ProgramService();
	const deleted = await programService.deleteForUser(locals.user.id, programId);

	if (!deleted) {
		return json({ error: 'Программа не найдена' }, { status: 404 });
	}

	return new Response(null, { status: 204 });
};
