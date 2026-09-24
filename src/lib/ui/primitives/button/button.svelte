<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-display text-sm font-bold transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary-dim',
				secondary: 'bg-card text-card-foreground border border-border hover:bg-secondary',
				outline: 'border border-border bg-transparent text-foreground hover:bg-card',
				ghost: 'bg-transparent text-foreground hover:bg-card',
				destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
				link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto'
			},
			size: {
				default: 'h-11 px-5 py-2.5',
				sm: 'h-9 px-4 text-xs',
				lg: 'h-12 px-6 text-base',
				icon: 'size-10 rounded-full'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
</script>

<script lang="ts">
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type CommonProps = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
	};

	type Props = CommonProps &
		(
			| ({ href: string; ref?: HTMLAnchorElement | null } & HTMLAnchorAttributes)
			| ({ href?: undefined; ref?: HTMLButtonElement | null } & HTMLButtonAttributes)
		);

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href,
		type = 'button',
		children,
		...restProps
	}: Props = $props();
</script>

{#if href}
	<!-- generic primitive, href may be external or a pre-resolved path -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		bind:this={ref}
		{href}
		class={cn(buttonVariants({ variant, size }), className)}
		{...restProps as HTMLAnchorAttributes}
	>
		{@render children?.()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		bind:this={ref}
		type={type as HTMLButtonAttributes['type']}
		class={cn(buttonVariants({ variant, size }), className)}
		{...restProps as HTMLButtonAttributes}
	>
		{@render children?.()}
	</button>
{/if}
