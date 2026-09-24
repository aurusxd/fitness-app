import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UserRepository } from '$lib/server/repositories/userRepository';
import { updateProfileSchema } from '$lib/validation/schemas';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const parsed = updateProfileSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Неверный запрос' }, { status: 400 });
	}

	const userRepository = new UserRepository();
	const updated = await userRepository.updateProfile(locals.user.id, parsed.data);

	if (!updated) {
		return json({ error: 'Профиль не найден' }, { status: 404 });
	}

	return json({ profile: updated.toProfileDto() });
};
