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
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<h1 class="font-display text-lg font-bold">Workout Log</h1>

	<div class="flex gap-3">
		<Card class="flex-1">
			<CardContent class="p-4 text-center">
				<div class="font-display text-2xl font-extrabold">{data.entries.length}</div>
				<div class="text-xs font-semibold text-muted-foreground">Sets logged</div>
			</CardContent>
		</Card>
		<Card class="flex-1 border-primary bg-primary">
			<CardContent class="p-4 text-center">
				<div class="font-display text-2xl font-extrabold text-primary-foreground">
					{days.length}
				</div>
				<div class="text-xs font-semibold text-primary-foreground/70">Training days</div>
			</CardContent>
		</Card>
	</div>

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
