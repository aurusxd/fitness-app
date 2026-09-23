<script lang="ts">
	import { Progress as ProgressPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		value = 0,
		max = 100,
		...restProps
	}: ProgressPrimitive.RootProps = $props();

	const percent = $derived(Math.min(100, Math.max(0, ((value ?? 0) / max) * 100)));
</script>

<ProgressPrimitive.Root
	bind:ref
	{value}
	{max}
	class={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
	{...restProps}
>
	<div
		class="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
		style={`width: ${percent}%`}
	></div>
</ProgressPrimitive.Root>
