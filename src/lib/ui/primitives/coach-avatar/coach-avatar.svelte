<script lang="ts">
	import ZapIcon from '@lucide/svelte/icons/zap';
	import { cn } from '$lib/utils';

	type Props = {
		/** The coach is composing a reply: an arc circles the mark until it lands. */
		thinking?: boolean;
		class?: string;
	};

	let { thinking = false, class: className }: Props = $props();
</script>

<!-- The same lime bolt as the coach's tab, so the chat speaks with the mark the athlete tapped. -->
<span
	class={cn(
		'relative grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_rgba(182,255,58,0.55)]',
		className
	)}
	aria-hidden="true"
>
	<ZapIcon class="size-3.5" strokeWidth={2.5} />
	{#if thinking}
		<span class="coach-orbit"></span>
	{/if}
</span>
