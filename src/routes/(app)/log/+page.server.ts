import type { PageServerLoad } from './$types';
import { WorkoutLogService } from '$lib/server/services/workoutLogService';

const CHART_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals }) => {
	const workoutLogService = new WorkoutLogService();
	const from = new Date(Date.now() - (CHART_DAYS - 1) * DAY_MS);

	const [entries, summary] = await Promise.all([
		workoutLogService.historyForUser(locals.user.id),
		workoutLogService.summary(locals.user.id, from)
	]);

	return { entries, summary };
};
