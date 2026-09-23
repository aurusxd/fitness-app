import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

/** The Mini App opens at the root, so send it straight into the app shell. */
export const load: PageServerLoad = () => {
	redirect(307, resolve('/(app)/programs'));
};
