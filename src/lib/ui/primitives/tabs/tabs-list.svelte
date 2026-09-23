<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
	bind:ref
	class={cn(
		'inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-card p-1 text-muted-foreground',
		className
	)}
	{...restProps}
/>
