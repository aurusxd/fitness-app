<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/ui/primitives/button';

	const message = $derived(
		page.status === 404
			? 'This page does not exist.'
			: (page.error?.message ?? 'Something went wrong.')
	);
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6">
	<div class="font-display text-5xl font-extrabold text-primary">{page.status}</div>
	<p class="text-center text-sm text-muted-foreground">{message}</p>
	<Button href={resolve('/(app)/programs')}>Back to my programs</Button>
</div>
