<script lang="ts">
	import { Input } from '$lib/ui/primitives/input';
	import { Badge } from '$lib/ui/primitives/badge';
	import { muscleGroupLabel, plural } from '$lib/utils';
	import EditExerciseModal from './EditExerciseModal.svelte';
	import type { ExerciseDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Writable derived: follows a new filter result, but still accepts a local edit.
	let exercises = $derived(data.exercises);

	function onUpdated(updated: ExerciseDto) {
		exercises = exercises.map((exercise) => (exercise.id === updated.id ? updated : exercise));
	}

	function submitOnChange(event: Event) {
		(event.currentTarget as HTMLElement).closest('form')?.requestSubmit();
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6">
	<h1 class="font-display text-lg font-bold">Библиотека упражнений</h1>

	<form method="GET" class="flex flex-col gap-3">
		<Input name="search" value={data.filter.search ?? ''} placeholder="Поиск упражнений…" />

		<div class="flex gap-3">
			<select
				name="muscleGroup"
				onchange={submitOnChange}
				class="h-11 flex-1 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm text-foreground"
			>
				<option value="">Все группы мышц</option>
				{#each data.muscleGroups as group (group)}
					<option value={group} selected={data.filter.muscleGroup === group}>
						{muscleGroupLabel(group)}
					</option>
				{/each}
			</select>

			<select
				name="equipment"
				onchange={submitOnChange}
				class="h-11 flex-1 rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm text-foreground"
			>
				<option value="">Любой инвентарь</option>
				<option value="none" selected={data.filter.equipment === 'none'}>Свой вес</option>
				{#each data.equipment as item (item)}
					<option value={item} selected={data.filter.equipment === item}>{item}</option>
				{/each}
			</select>
		</div>
	</form>

	<p class="text-xs text-muted-foreground">
		{plural(exercises.length, ['упражнение', 'упражнения', 'упражнений'])}
	</p>

	{#if exercises.length === 0}
		<p class="text-center text-sm text-muted-foreground">Ничего не нашлось по этим фильтрам.</p>
	{/if}

	<div class="flex flex-col gap-2.5">
		{#each exercises as exercise (exercise.id)}
			<div
				class="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-border bg-card p-3"
			>
				<div
					class="size-14 shrink-0 rounded-[var(--radius-sm)] bg-gradient-to-br from-[#2b4432] to-[#132018]"
				></div>

				<div class="min-w-0 flex-1">
					<div class="truncate text-sm font-bold">{exercise.name}</div>
					<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<span class="truncate">{muscleGroupLabel(exercise.muscleGroup)}</span>
						<span>·</span>
						<span class="truncate">{exercise.isBodyweight ? 'свой вес' : exercise.equipment}</span>
					</div>
					{#if exercise.needsCategorisation}
						<Badge variant="accent" class="mt-1.5">Нужна категория</Badge>
					{/if}
				</div>

				<EditExerciseModal {exercise} {onUpdated} />
			</div>
		{/each}
	</div>
</div>
