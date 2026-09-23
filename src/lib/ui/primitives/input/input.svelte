<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLInputAttributes & {
		ref?: HTMLInputElement | null;
	};

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<input
	bind:this={ref}
	bind:value
	class={cn(
		'flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
/>
