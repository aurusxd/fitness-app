import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ProgramService } from '$lib/server/services/programService';

export const load: PageServerLoad = async ({ locals, params }) => {
	const programId = Number(params.id);
	if (!Number.isInteger(programId)) {
		error(404, 'Program not found');
	}

	const programService = new ProgramService();
	const program = await programService.getForUser(locals.user.id, programId);

	if (!program) {
		error(404, 'Program not found');
	}

	return { program };
};
