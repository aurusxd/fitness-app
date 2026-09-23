<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/ui/primitives/card';
	import { Badge } from '$lib/ui/primitives/badge';
	import LogExerciseModal from './LogExerciseModal.svelte';
	import type { WorkoutLogDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let entries = $state<WorkoutLogDto[]>(data.entries);

	const lastLogByExercise = $derived(
		new Map(
			[...entries]
				.sort((a, b) => a.performedAt.localeCompare(b.performedAt))
				.map((entry) => [entry.programExerciseId, entry])
		)
	);

	function onLogged(entry: WorkoutLogDto) {
		entries = [entry, ...entries];
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<div>
		<div class="mb-2 flex items-center gap-2">
			<h1 class="font-display text-lg font-bold">{data.program.title}</h1>
			<Badge variant={data.program.source === 'ai_generated' ? 'default' : 'secondary'}>
				{data.program.source === 'ai_generated' ? 'AI' : 'Manual'}
			</Badge>
		</div>
		<p class="text-sm text-muted-foreground">
			{data.program.days.length} day{data.program.days.length === 1 ? '' : 's'} per week
		</p>
	</div>

	<div class="flex flex-col gap-4">
		{#each data.program.days as day (day.dayIndex)}
			<Card>
				<CardHeader>
					<CardTitle>{DAY_NAMES[day.dayIndex] ?? `Day ${day.dayIndex + 1}`}</CardTitle>
				</CardHeader>
				<CardContent class="flex flex-col gap-3">
					{#each day.exercises as exercise (exercise.id)}
						{@const lastLog = lastLogByExercise.get(exercise.id)}
						<div
							class="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-muted px-4 py-3"
						>
							<div class="min-w-0">
								<div class="truncate text-sm font-semibold">{exercise.exerciseName}</div>
								<div class="text-xs text-muted-foreground">
									{exercise.sets} × {exercise.reps}
									{#if exercise.restSeconds}
										· {exercise.restSeconds}s rest
									{/if}
								</div>
								{#if lastLog}
									<div class="mt-1 text-xs font-semibold text-primary">
										Done {lastLog.setsDone} × {lastLog.repsDone}{lastLog.weightKg
											? ` · ${lastLog.weightKg} kg`
											: ''}
									</div>
								{/if}
							</div>
							<LogExerciseModal {exercise} {onLogged} />
						</div>
					{/each}
				</CardContent>
			</Card>
		{/each}
	</div>
</div>
