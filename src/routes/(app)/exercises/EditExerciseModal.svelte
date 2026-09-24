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
	import type { ExerciseDto } from '$lib/types';

	let {
		exercise,
		onUpdated
	}: { exercise: ExerciseDto; onUpdated: (updated: ExerciseDto) => void } = $props();

	let open = $state(false);
	let muscleGroup = $state(exercise.muscleGroup);
	let equipment = $state(exercise.equipment ?? '');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	async function submit() {
		saving = true;
		errorMessage = null;

		try {
			const response = await authFetch(`/api/exercises/${exercise.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ muscleGroup, equipment: equipment.trim() || null })
			});

			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Не удалось сохранить упражнение.';
				return;
			}

			onUpdated(body.exercise as ExerciseDto);
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
			<Button variant="ghost" size="sm" {...props}>Изменить</Button>
		{/snippet}
	</ModalTrigger>

	<ModalContent>
		<ModalHeader>
			<ModalTitle>{exercise.name}</ModalTitle>
			<ModalDescription
				>Укажи группу мышц и инвентарь, чтобы упражнение попадало в фильтры.</ModalDescription
			>
		</ModalHeader>

		<form
			class="mt-4 flex flex-col gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-muted-foreground">Группа мышц</span>
				<Input bind:value={muscleGroup} required />
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-muted-foreground">
					Инвентарь (пусто — свой вес)
				</span>
				<Input bind:value={equipment} placeholder="—" />
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
