<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { CoachAvatar } from '$lib/ui/primitives/coach-avatar';
	import { cn } from '$lib/utils';

	type Props = HTMLAttributes<HTMLDivElement> & {
		role: 'user' | 'assistant';
		/** The coach is still composing this reply. */
		thinking?: boolean;
		/** Plays the entrance: for messages that arrive while the chat is open, not loaded history. */
		fresh?: boolean;
	};

	let {
		role,
		thinking = false,
		fresh = false,
		class: className,
		children,
		...restProps
	}: Props = $props();
</script>

<div
	class={cn(
		'flex items-end gap-2.5',
		role === 'user' ? 'origin-bottom-right justify-end' : 'origin-bottom-left',
		fresh && 'motion-rise'
	)}
	{...restProps}
>
	{#if role === 'assistant'}
		<CoachAvatar {thinking} />
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
