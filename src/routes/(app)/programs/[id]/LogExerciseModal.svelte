<script lang="ts">
	import {
		Modal,
		ModalTrigger,
		ModalContent,
		ModalHeader,
		ModalTitle,
		ModalDescription,
		ModalFooter,
		ModalClose
	} from '$lib/ui/primitives/modal';
	import { Button } from '$lib/ui/primitives/button';
	import { Input } from '$lib/ui/primitives/input';
	import { authFetch } from '$lib/client/telegram';
	import type { ProgramExerciseDto, WorkoutLogDto } from '$lib/types';

	let {
		exercise,
		onLogged
	}: { exercise: ProgramExerciseDto; onLogged: (entry: WorkoutLogDto) => void } = $props();

	let open = $state(false);
	let setsDone = $state<number | null>(exercise.sets);
	let repsDone = $state(exercise.reps);
	let weightKg = $state<number | null>(null);
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	async function submit() {
		saving = true;
		errorMessage = null;

		try {
			const weight = weightKg === null || Number.isNaN(weightKg) ? undefined : weightKg;

			const response = await authFetch('/api/log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					programExerciseId: exercise.id,
					setsDone,
					repsDone,
					weightKg: weight
				})
			});

			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Не удалось сохранить подход.';
				return;
			}

			onLogged(body.entry as WorkoutLogDto);
			open = false;
		} catch {
			errorMessage = 'Ошибка сети. Попробуй ещё раз.';
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open>
	<ModalTrigger>
		{#snippet child({ props })}
			<Button variant="secondary" size="sm" {...props}>Отметить</Button>
		{/snippet}
	</ModalTrigger>

	<ModalContent>
		<ModalHeader>
			<ModalTitle>{exercise.exerciseName}</ModalTitle>
			<ModalDescription>По плану: {exercise.sets} × {exercise.reps}</ModalDescription>
		</ModalHeader>

		<form
			class="mt-4 flex flex-col gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-muted-foreground">Подходов сделано</span>
				<Input type="number" min="1" max="20" bind:value={setsDone} required />
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-muted-foreground">Повторений</span>
				<Input bind:value={repsDone} required />
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-muted-foreground">Вес, кг (необязательно)</span>
				<Input type="number" min="0" step="0.5" bind:value={weightKg} placeholder="—" />
			</label>

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}

			<ModalFooter>
				<ModalClose>
					{#snippet child({ props })}
						<Button variant="outline" {...props}>Отмена</Button>
					{/snippet}
				</ModalClose>
				<Button type="submit" disabled={saving}>{saving ? 'Сохраняю…' : 'Сохранить'}</Button>
			</ModalFooter>
		</form>
	</ModalContent>
</Modal>
