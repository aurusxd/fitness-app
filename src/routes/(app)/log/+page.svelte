<script lang="ts">
	import { Card, CardContent } from '$lib/ui/primitives/card';
	import { Badge } from '$lib/ui/primitives/badge';
	import type { WorkoutLogDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const dateFormatter = new Intl.DateTimeFormat('en', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});

	function groupByDay(entries: WorkoutLogDto[]): { day: string; entries: WorkoutLogDto[] }[] {
		const days: { day: string; entries: WorkoutLogDto[] }[] = [];

		for (const entry of entries) {
			const day = entry.performedAt.slice(0, 10);
			const current = days.at(-1);

			if (current?.day === day) {
				current.entries.push(entry);
			} else {
				days.push({ day, entries: [entry] });
			}
		}

		return days;
	}

	const days = $derived(groupByDay(data.entries));

	const chart = $derived.by(() => {
		const points = data.summary.perDay;
		const peak = Math.max(1, ...points.map((point) => point.sets));
		const width = 300;
		const height = 90;
		const step = points.length > 1 ? width / (points.length - 1) : 0;

		return {
			peak,
			width,
			height,
			polyline: points
				.map((point, index) => `${index * step},${height - (point.sets / peak) * height}`)
				.join(' '),
			firstLabel: points[0]?.date.slice(5),
			lastLabel: points.at(-1)?.date.slice(5)
		};
	});
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<h1 class="font-display text-lg font-bold">Workout Log</h1>

	<div class="flex gap-2.5">
		<Card class="flex-1">
			<CardContent class="p-4 text-center">
				<div class="font-display text-xl font-extrabold">{data.summary.exercisesLogged}</div>
				<div class="mt-0.5 text-[11px] font-semibold text-muted-foreground">Exercises</div>
			</CardContent>
		</Card>
		<Card class="flex-1 border-primary bg-primary">
			<CardContent class="p-4 text-center">
				<div class="font-display text-xl font-extrabold text-primary-foreground">
					{data.summary.setsLogged}
				</div>
				<div class="mt-0.5 text-[11px] font-semibold text-primary-foreground/70">Sets</div>
			</CardContent>
		</Card>
		<Card class="flex-1">
			<CardContent class="p-4 text-center">
				<div class="font-display text-xl font-extrabold">{data.summary.trainingDays}</div>
				<div class="mt-0.5 text-[11px] font-semibold text-muted-foreground">Days</div>
			</CardContent>
		</Card>
	</div>

	<Card>
		<CardContent class="p-4.5">
			<div class="mb-1 flex items-center justify-between">
				<span class="text-xs font-semibold text-muted-foreground">Sets per day</span>
				<span class="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold">
					Last 14 days
				</span>
			</div>
			<div class="font-display text-2xl font-extrabold">
				{data.summary.setsLogged}
				<span class="text-sm font-semibold text-muted-foreground">sets</span>
			</div>

			<svg
				viewBox="0 0 {chart.width} {chart.height}"
				preserveAspectRatio="none"
				class="mt-2.5 block h-24 w-full"
				role="img"
				aria-label="Sets logged per day over the last 14 days"
			>
				<polyline
					points={chart.polyline}
					fill="none"
					stroke="#B6FF3A"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke"
				/>
			</svg>

			<div class="mt-1.5 flex justify-between text-[10.5px] font-semibold text-muted-foreground">
				<span>{chart.firstLabel}</span>
				<span>peak {chart.peak}</span>
				<span>{chart.lastLabel}</span>
			</div>
		</CardContent>
	</Card>

	{#if data.entries.length === 0}
		<p class="text-center text-sm text-muted-foreground">
			Nothing logged yet. Open a program and tick off an exercise after you finish it.
		</p>
	{/if}

	<div class="flex flex-col gap-5">
		{#each days as { day, entries } (day)}
			<div class="flex flex-col gap-2">
				<div class="flex items-baseline justify-between">
					<h2 class="font-display text-sm font-bold">
						{dateFormatter.format(new Date(day))}
					</h2>
					<span class="text-xs text-muted-foreground">{entries.length} logged</span>
				</div>

				{#each entries as entry (entry.id)}
					<Card>
						<CardContent class="flex items-center justify-between gap-4 p-4">
							<div class="min-w-0">
								<div class="truncate text-sm font-semibold">{entry.exerciseName}</div>
								<div class="truncate text-xs text-muted-foreground">{entry.programTitle}</div>
							</div>
							<Badge variant="secondary">
								{entry.setsDone} × {entry.repsDone}{entry.weightKg ? ` · ${entry.weightKg} kg` : ''}
							</Badge>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/each}
	</div>
</div>
