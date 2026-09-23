import type { PageServerLoad } from './$types';
import { WorkoutLogService } from '$lib/server/services/workoutLogService';

export const load: PageServerLoad = async ({ locals }) => {
	const workoutLogService = new WorkoutLogService();
	const entries = await workoutLogService.historyForUser(locals.user.id);

	return { entries };
};
