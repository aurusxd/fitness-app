import type { PageServerLoad } from './$types';
import { ProgramService } from '$lib/server/services/programService';

export const load: PageServerLoad = async ({ locals }) => {
	const programService = new ProgramService();
	const programs = await programService.listForUser(locals.user.id);

	return { programs };
};
