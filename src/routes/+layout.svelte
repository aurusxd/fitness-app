<script lang="ts">
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initTelegramWebApp } from '$lib/client/telegram';

	let { children } = $props();

	onMount(initTelegramWebApp);

	// Screens cross-fade instead of swapping in one frame. Starts only once the next screen's data is
	// in, so it never adds to the wait; engines without view transitions just swap as before.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
