<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	class={cn(
		'inline-flex items-center justify-center rounded-[calc(var(--radius-md)-4px)] px-4 py-2 font-display text-sm font-bold text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
		className
	)}
	{...restProps}
/>
