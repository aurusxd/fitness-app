<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/ui/primitives/badge';
	import { Button } from '$lib/ui/primitives/button';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { cn } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const today = new Date().toISOString().slice(0, 10);

	const week = $derived(
		data.week.perDay.slice(0, 7).map((day, index) => ({
			...day,
			label: WEEKDAYS[index],
			dayOfMonth: Number(day.date.slice(8, 10)),
			isToday: day.date === today
		}))
	);

	const greeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning!';
		if (hour < 18) return 'Good afternoon!';
		return 'Good evening!';
	});

	const nudge = $derived.by(() => {
		if (!data.profile.isComplete) {
			return 'Tell the coach your goal and level, and it will build a program around them.';
		}
		if (data.programCount === 0) {
			return 'No program yet. Ask the AI coach for one built around your goal.';
		}
		if (data.week.trainingDays === 0) {
			return 'Nothing logged this week yet. One session is enough to start the streak.';
		}
		return `${data.week.trainingDays} training day${data.week.trainingDays === 1 ? '' : 's'} this week. Keep it going.`;
	});
</script>

<div class="flex flex-col gap-7 px-6 py-5">
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div
				class="size-11 shrink-0 rounded-full border border-white/12 bg-gradient-to-br from-[#3a5d45] to-[#1c2f22]"
			></div>
			<div>
				<div class="text-xs font-medium text-muted-foreground">{greeting}</div>
				<div class="font-display text-[17px] font-extrabold">
					{data.profile.username ?? 'Athlete'}
				</div>
			</div>
		</div>

		{#if data.profile.isComplete}
			<Badge variant="secondary">{data.profile.goal}</Badge>
		{:else}
			<Badge variant="accent">Set up profile</Badge>
		{/if}
	</header>

	<a
		href={resolve('/(app)/exercises')}
		class="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground"
	>
		<SearchIcon class="size-4" />
		<span class="flex-1">Search exercises…</span>
	</a>

	<section>
		<div class="mb-3.5 flex items-baseline justify-between">
			<h2 class="font-display text-lg font-extrabold">This week</h2>
			<span class="text-[13px] font-semibold text-muted-foreground">
				{data.week.trainingDays}/7 days
			</span>
		</div>

		<div class="flex gap-2">
			{#each week as day (day.date)}
				<div
					class={cn(
						'flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 font-display text-[11.5px] font-semibold',
						day.isToday ? 'bg-foreground text-background' : 'text-muted-foreground'
					)}
				>
					<span>{day.label}</span>
					<span class={cn('text-sm font-extrabold', !day.isToday && 'text-foreground/80')}>
						{day.dayOfMonth}
					</span>
					<span
						class={cn(
							'size-1.5 rounded-full',
							day.sets > 0 ? 'bg-primary' : day.isToday ? 'bg-background/25' : 'bg-transparent'
						)}
					></span>
				</div>
			{/each}
		</div>
	</section>

	<div
		class="flex items-center gap-3.5 rounded-[20px] border border-primary/18 bg-gradient-to-r from-primary/14 to-primary/3 px-4.5 py-4"
	>
		<div class="size-8 shrink-0 rounded-full border-[3px] border-primary/25 border-t-primary"></div>
		<p class="m-0 text-[13px] leading-snug font-medium">{nudge}</p>
	</div>

	<section>
		<div class="mb-3.5 flex items-center justify-between">
			<h2 class="font-display text-lg font-extrabold">Your program</h2>
			{#if data.latestProgram?.source === 'ai_generated'}
				<Badge variant="default">
					<SparklesIcon class="size-3" />
					AI generated
				</Badge>
			{/if}
		</div>

		{#if data.latestProgram}
			{@const program = data.latestProgram}
			<div
				class="relative flex min-h-[190px] flex-col justify-end overflow-hidden rounded-3xl border border-border p-5"
				style="background: linear-gradient(0deg, rgba(5,10,7,.92), rgba(5,10,7,.35) 55%, rgba(5,10,7,.1)), linear-gradient(135deg, #1c3324, #0d1712);"
			>
				<div
					class="absolute top-2.5 -right-2.5 bottom-[-10px] w-1/2 rounded-3xl opacity-90"
					style="background: radial-gradient(60% 60% at 60% 40%, #2f4a37 0%, transparent 70%), linear-gradient(200deg, #243c2c, #0f1a14);"
				></div>

				<div class="relative z-10 max-w-[65%]">
					<h3 class="mb-1.5 font-display text-xl font-extrabold">{program.title}</h3>
					<p class="mb-3.5 text-[12.5px] text-muted-foreground">
						{program.days.length} day{program.days.length === 1 ? '' : 's'} ·
						{program.days.reduce((total, day) => total + day.exercises.length, 0)} exercises
					</p>
				</div>

				<Button
					href={resolve('/(app)/programs/[id]', { id: String(program.id) })}
					class="relative z-10 self-start"
				>
					Open program
				</Button>
			</div>
		{:else}
			<div
				class="flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground"
			>
				<p class="m-0">No programs yet.</p>
				<Button href={resolve('/(app)/trainer')}>Ask the AI coach</Button>
			</div>
		{/if}

		{#if data.programCount > 1}
			<a
				href={resolve('/(app)/programs')}
				class="mt-3 block text-center text-xs font-semibold text-muted-foreground"
			>
				All {data.programCount} programs
			</a>
		{/if}
	</section>

	{#if data.muscleGroups.length > 0}
		<section>
			<h2 class="mb-3.5 font-display text-lg font-extrabold">Body focus</h2>
			<div class="flex gap-3">
				{#each data.muscleGroups as group (group)}
					<a
						href="{resolve('/(app)/exercises')}?muscleGroup={encodeURIComponent(group)}"
						class="flex-1 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-4 text-center"
					>
						<span class="text-xs font-semibold text-muted-foreground">{group}</span>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
