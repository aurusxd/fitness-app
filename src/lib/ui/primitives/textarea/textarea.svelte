<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLTextareaAttributes & {
		ref?: HTMLTextAreaElement | null;
	};

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	class={cn(
		'flex min-h-24 w-full rounded-[var(--radius-md)] border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		className
	)}
	{...restProps}></textarea>
