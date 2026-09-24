import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ExerciseRepository } from '$lib/server/repositories/exerciseRepository';
import { updateExerciseSchema } from '$lib/validation/schemas';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const exerciseId = Number(params.id);
	if (!Number.isInteger(exerciseId)) {
		return json({ error: 'Упражнение не найдено' }, { status: 404 });
	}

	const body = await request.json().catch(() => null);
	const parsed = updateExerciseSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Неверный запрос' }, { status: 400 });
	}

	const exerciseRepository = new ExerciseRepository();
	const updated = await exerciseRepository.updateCategorisation(exerciseId, parsed.data);

	if (!updated) {
		return json({ error: 'Упражнение не найдено' }, { status: 404 });
	}

	return json({ exercise: updated.toDto() });
};
