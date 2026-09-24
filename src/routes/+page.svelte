<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { signIn } from '$lib/client/telegram';

	onMount(async () => {
		// Outside Telegram this is a no-op: the hook then decides, so local browsing keeps working.
		await signIn();
		await goto(resolve('/(app)/home'), { replaceState: true });
	});
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6">
	<div class="font-display text-2xl font-extrabold text-primary">CoachAI</div>
	<p class="text-center text-sm text-muted-foreground">Входим…</p>
</div>
