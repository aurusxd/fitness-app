<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLAttributes<HTMLDivElement> & {
		role: 'user' | 'assistant';
	};

	let { role, class: className, children, ...restProps }: Props = $props();
</script>

<div class={cn('flex items-end gap-2.5', role === 'user' && 'justify-end')} {...restProps}>
	{#if role === 'assistant'}
		<div class="size-6.5 shrink-0 rounded-full border-2 border-primary/30 border-t-primary"></div>
	{/if}
	<div
		class={cn(
			'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
			role === 'assistant'
				? 'rounded-bl-[5px] border border-border bg-card text-card-foreground'
				: 'rounded-br-[5px] bg-primary font-semibold text-primary-foreground',
			className
		)}
	>
		{@render children?.()}
	</div>
</div>
