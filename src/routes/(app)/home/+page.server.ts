import type { PageServerLoad } from './$types';
import { ProgramService } from '$lib/server/services/programService';
import { WorkoutLogService } from '$lib/server/services/workoutLogService';
import { ExerciseRepository } from '$lib/server/repositories/exerciseRepository';

/** Monday 00:00 UTC of the week `reference` falls in. */
function startOfWeek(reference: Date): Date {
	const monday = new Date(reference);
	monday.setUTCHours(0, 0, 0, 0);
	const weekday = (monday.getUTCDay() + 6) % 7;
	monday.setUTCDate(monday.getUTCDate() - weekday);
	return monday;
}

export const load: PageServerLoad = async ({ locals }) => {
	const workoutLogService = new WorkoutLogService();
	const programService = new ProgramService();
	const exerciseRepository = new ExerciseRepository();

	const monday = startOfWeek(new Date());
	const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);

	// The week's entries ride along, so picking a day on the strip needs no round trip.
	const [week, weekEntries, programs, muscleGroups] = await Promise.all([
		workoutLogService.summary(locals.user.id, monday, sunday),
		workoutLogService.historySince(locals.user.id, monday),
		programService.listForUser(locals.user.id),
		exerciseRepository.distinctMuscleGroups()
	]);

	return {
		profile: locals.user.toProfileDto(),
		week,
		weekEntries,
		latestProgram: programs[0] ?? null,
		programCount: programs.length,
		muscleGroups: muscleGroups.slice(0, 3)
	};
};
