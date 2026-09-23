import type { PageServerLoad } from './$types';
import { ExerciseRepository } from '$lib/server/repositories/exerciseRepository';
import { exerciseFilterSchema } from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ url }) => {
	// Empty params come from the "All" options of the filter form and mean "no filter", not an invalid value.
	const param = (key: string) => url.searchParams.get(key)?.trim() || undefined;

	const parsed = exerciseFilterSchema.safeParse({
		muscleGroup: param('muscleGroup'),
		equipment: param('equipment'),
		search: param('search')
	});

	const filter = parsed.success ? parsed.data : {};
	const exerciseRepository = new ExerciseRepository();

	const [exercises, muscleGroups, equipment] = await Promise.all([
		exerciseRepository.list(filter),
		exerciseRepository.distinctMuscleGroups(),
		exerciseRepository.distinctEquipment()
	]);

	return {
		exercises: exercises.map((exercise) => exercise.toDto()),
		muscleGroups,
		equipment,
		filter
	};
};
