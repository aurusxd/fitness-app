<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-display text-xs font-bold transition-colors',
		variants: {
			variant: {
				default: 'border-primary/30 bg-primary/10 text-primary',
				secondary: 'border-border bg-secondary text-secondary-foreground',
				accent: 'border-transparent bg-accent text-accent-foreground',
				outline: 'border-border bg-transparent text-foreground'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		variant?: BadgeVariant;
	};

	let { class: className, variant = 'default', children, ...restProps }: Props = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</span>
