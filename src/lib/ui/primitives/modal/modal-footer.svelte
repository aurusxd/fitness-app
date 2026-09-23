<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('mt-4 flex items-center justify-end gap-2', className)} {...restProps}>
	{@render children?.()}
</div>
