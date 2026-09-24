<script lang="ts">
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import HouseIcon from '@lucide/svelte/icons/house';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
	import UserIcon from '@lucide/svelte/icons/user';
	import { cn } from '$lib/utils';

	let { children } = $props();

	const tabs = [
		{ href: resolve('/(app)/home'), label: 'Главная', icon: HouseIcon },
		{ href: resolve('/(app)/exercises'), label: 'Каталог', icon: SearchIcon },
		{ href: resolve('/(app)/trainer'), label: 'Тренер', icon: ZapIcon, hub: true },
		{ href: resolve('/(app)/log'), label: 'Журнал', icon: ChartColumnIcon },
		{ href: resolve('/(app)/profile'), label: 'Профиль', icon: UserIcon }
	];

	// The tapped tab lights up at once, while its screen is still loading, so a tap never looks ignored.
	const currentPath = $derived(navigating.to?.url.pathname ?? page.url.pathname);

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}
</script>

{#if navigating.to}
	<div class="nav-progress" aria-hidden="true"></div>
{/if}

<div class="min-h-dvh pb-28">
	{@render children()}
</div>

<!-- Every tab's code is fetched up front, so the first switch waits only for its data. -->
<nav
	data-sveltekit-preload-code="eager"
	class="tab-bar fixed inset-x-3.5 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-white/6 bg-[rgba(15,22,18,0.82)] px-2.5 py-2 backdrop-blur-lg"
>
	{#each tabs as tab (tab.href)}
		{@const active = isActive(tab.href)}
		{#if tab.hub}
			<a
				href={tab.href}
				aria-label={tab.label}
				aria-current={active ? 'page' : undefined}
				class="relative -top-4 flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_-6px_rgba(182,255,58,0.55)] transition-transform duration-150 ease-out active:scale-90"
			>
				<tab.icon class="size-5.5" />
			</a>
		{:else}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class={cn(
					'flex flex-1 flex-col items-center gap-1 rounded-[18px] py-2 font-display text-[10.5px] font-semibold transition-[color,transform] duration-200 ease-out active:scale-95',
					active ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				<tab.icon
					class={cn(
						'size-5 transition-[color,transform] duration-200 ease-out',
						active && '-translate-y-0.5 text-primary'
					)}
				/>
				{tab.label}
			</a>
		{/if}
	{/each}
</nav>
