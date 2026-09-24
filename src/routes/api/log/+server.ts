import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logWorkoutSetSchema } from '$lib/validation/schemas';
import {
	WorkoutLogService,
	ProgramExerciseNotFoundError
} from '$lib/server/services/workoutLogService';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const parsed = logWorkoutSetSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Неверный запрос' }, { status: 400 });
	}

	const workoutLogService = new WorkoutLogService();

	try {
		const entry = await workoutLogService.logSet(locals.user.id, parsed.data);
		return json({ entry }, { status: 201 });
	} catch (error) {
		if (error instanceof ProgramExerciseNotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		throw error;
	}
};
