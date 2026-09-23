<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initTelegramWebApp } from '$lib/client/telegram';

	let { children } = $props();

	onMount(initTelegramWebApp);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
