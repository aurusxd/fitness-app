<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { requestProgram } from '$lib/client/programs';
	import { Badge } from '$lib/ui/primitives/badge';
	import { Button } from '$lib/ui/primitives/button';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { cn, GOAL_LABELS, muscleGroupLabel, plural } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let generating = $state(false);
	let generationError = $state<string | null>(null);

	async function buildProgram() {
		generating = true;
		generationError = null;

		const result = await requestProgram();
		if ('error' in result) {
			generationError = result.error;
			generating = false;
			return;
		}

		// Stays in the busy state until the program screen replaces this one.
		await goto(resolve('/(app)/programs/[id]', { id: String(result.program.id) }));
	}

	const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
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
		if (hour < 12) return 'Доброе утро!';
		if (hour < 18) return 'Добрый день!';
		return 'Добрый вечер!';
	});

	const nudge = $derived.by(() => {
		if (!data.profile.isComplete) {
			return 'Расскажи тренеру о цели и уровне — он соберёт программу под них.';
		}
		if (data.programCount === 0) {
			return 'Программы пока нет. Собери первую ниже — тренер подберёт её под твою цель и уровень.';
		}
		if (data.week.trainingDays === 0) {
			return 'На этой неделе пока пусто. Одной тренировки хватит, чтобы начать серию.';
		}
		return `${plural(data.week.trainingDays, ['тренировка', 'тренировки', 'тренировок'])} на этой неделе. Так держать.`;
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
					{data.profile.username ?? 'Спортсмен'}
				</div>
			</div>
		</div>

		{#if data.profile.isComplete && data.profile.goal}
			<Badge variant="secondary">{GOAL_LABELS[data.profile.goal]}</Badge>
		{:else}
			<Badge variant="accent">Заполнить профиль</Badge>
		{/if}
	</header>

	<a
		href={resolve('/(app)/exercises')}
		class="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground"
	>
		<SearchIcon class="size-4" />
		<span class="flex-1">Поиск упражнений…</span>
	</a>

	<section>
		<div class="mb-3.5 flex items-baseline justify-between">
			<h2 class="font-display text-lg font-extrabold">Эта неделя</h2>
			<span class="text-[13px] font-semibold text-muted-foreground">
				{data.week.trainingDays}/7 дней
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
			<h2 class="font-display text-lg font-extrabold">Твоя программа</h2>
			{#if data.latestProgram?.source === 'ai_generated'}
				<Badge variant="default">
					<SparklesIcon class="size-3" />
					Собрано ИИ
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
						{plural(program.days.length, ['день', 'дня', 'дней'])} ·
						{plural(
							program.days.reduce((total, day) => total + day.exercises.length, 0),
							['упражнение', 'упражнения', 'упражнений']
						)}
					</p>
				</div>

				<Button
					href={resolve('/(app)/programs/[id]', { id: String(program.id) })}
					class="relative z-10 self-start"
				>
					Открыть программу
				</Button>
			</div>
		{:else}
			<div
				class="flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground"
			>
				{#if data.profile.isComplete}
					<p class="m-0">
						Программ пока нет. ИИ-тренер соберёт первую по твоему профилю — это займёт до
						полуминуты.
					</p>
					<Button onclick={buildProgram} disabled={generating}>
						{#if generating}
							<LoaderCircleIcon class="motion-safe:animate-spin" />
						{:else}
							<SparklesIcon />
						{/if}
						{generating ? 'Собираю программу…' : 'Собрать программу'}
					</Button>
					{#if generationError}
						<p class="motion-fade m-0 text-destructive">{generationError}</p>
					{/if}
				{:else}
					<p class="m-0">
						Программ пока нет. Сначала заполни профиль — по цели и уровню тренер подбирает
						упражнения.
					</p>
					<Button href={resolve('/(app)/profile')}>Заполнить профиль</Button>
				{/if}
			</div>
		{/if}

		{#if data.programCount > 1}
			<a
				href={resolve('/(app)/programs')}
				class="mt-3 block text-center text-xs font-semibold text-muted-foreground"
			>
				Все программы ({data.programCount})
			</a>
		{/if}
	</section>

	{#if data.muscleGroups.length > 0}
		<section>
			<h2 class="mb-3.5 font-display text-lg font-extrabold">Группы мышц</h2>
			<div class="flex gap-3">
				{#each data.muscleGroups as group (group)}
					<a
						href="{resolve('/(app)/exercises')}?muscleGroup={encodeURIComponent(group)}"
						class="flex-1 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-4 text-center"
					>
						<span class="text-xs font-semibold text-muted-foreground"
							>{muscleGroupLabel(group)}</span
						>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
