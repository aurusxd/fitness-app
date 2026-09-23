import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ProgramService } from '$lib/server/services/programService';
import { WorkoutLogService } from '$lib/server/services/workoutLogService';

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

	const workoutLogService = new WorkoutLogService();
	const entries = await workoutLogService.historyForProgram(locals.user.id, programId);

	return { program, entries };
};
