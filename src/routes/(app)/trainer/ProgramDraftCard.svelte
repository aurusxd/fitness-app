<script lang="ts">
	import { resolve } from '$app/paths';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import DumbbellIcon from '@lucide/svelte/icons/dumbbell';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/ui/primitives/button';
	import {
		Modal,
		ModalTrigger,
		ModalContent,
		ModalHeader,
		ModalTitle,
		ModalDescription,
		ModalFooter
	} from '$lib/ui/primitives/modal';
	import { saveProgramDraft } from '$lib/client/trainer';
	import { WEEKDAYS_SHORT, cn, plural } from '$lib/utils';
	import type { ChatMessageDto } from '$lib/types';
	import type { GeneratedProgram } from '$lib/validation/schemas';

	type Props = {
		message: ChatMessageDto & { programDraft: GeneratedProgram };
		/** A newer version of this draft exists further down the chat. */
		superseded: boolean;
		onsaved: (message: ChatMessageDto) => void;
	};

	let { message, superseded, onsaved }: Props = $props();

	let open = $state(false);
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	const draft = $derived(message.programDraft);
	const days = $derived([...draft.days].sort((a, b) => a.dayIndex - b.dayIndex));
	const exerciseCount = $derived(draft.days.reduce((sum, day) => sum + day.exercises.length, 0));
	const summary = $derived(
		`${days.map((day) => WEEKDAYS_SHORT[day.dayIndex]).join(' · ')} · ${plural(exerciseCount, ['упражнение', 'упражнения', 'упражнений'])}`
	);
	const dimmed = $derived(superseded && message.savedProgramId === null);

	async function add() {
		saving = true;
		errorMessage = null;

		const result = await saveProgramDraft(message.id);
		saving = false;

		if ('error' in result) {
			errorMessage = result.error;
			return;
		}
		onsaved(result.message);
	}
</script>

<!-- The same action sits on the card and under the full program, so it can be added from either. -->
{#snippet actions(className: string)}
	{#if message.savedProgramId !== null}
		<div class={cn('motion-fade flex items-center justify-between gap-2', className)}>
			<span class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
				<CheckIcon class="size-4" />
				Добавлена
			</span>
			<Button
				href={resolve('/(app)/programs/[id]', { id: String(message.savedProgramId) })}
				size="sm"
				variant="outline"
			>
				Открыть
			</Button>
		</div>
	{:else}
		<Button class={cn('w-full', className)} size="sm" onclick={add} disabled={saving}>
			{#if saving}
				<LoaderCircleIcon class="motion-safe:animate-spin" />
			{:else}
				<PlusIcon />
			{/if}
			{saving ? 'Добавляю…' : 'Добавить в программы'}
		</Button>
	{/if}

	{#if errorMessage}
		<p class="motion-fade mt-2 text-xs text-destructive">{errorMessage}</p>
	{/if}
{/snippet}

<div
	class={cn(
		'mt-3 rounded-xl border border-primary/25 bg-background/40 p-3 transition-opacity duration-200',
		dimmed && 'opacity-60'
	)}
>
	<Modal bind:open>
		<ModalTrigger
			class="-m-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-lg p-1 text-left transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.98]"
			aria-label={`Посмотреть программу «${draft.title}»`}
		>
			<div class="min-w-0 flex-1">
				{#if dimmed}
					<p class="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
						Предыдущая версия
					</p>
				{/if}
				<div class="flex items-start gap-2">
					<DumbbellIcon class="mt-0.5 size-4 shrink-0 text-primary" />
					<p class="font-display leading-snug font-bold">{draft.title}</p>
				</div>
				<p class="mt-1 text-xs text-muted-foreground">{summary}</p>
			</div>
			<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
		</ModalTrigger>

		<ModalContent class="flex max-h-[85dvh] flex-col">
			<ModalHeader>
				<ModalTitle class="font-display leading-snug">{draft.title}</ModalTitle>
				<ModalDescription>{summary}</ModalDescription>
			</ModalHeader>

			<div class="-mx-6 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6">
				{#each days as day (day.dayIndex)}
					<section>
						<h3 class="mb-2 font-display text-sm font-bold">
							{WEEKDAYS_SHORT[day.dayIndex] ?? `День ${day.dayIndex + 1}`}
						</h3>
						<ul class="flex flex-col gap-2">
							{#each day.exercises as exercise, index (index)}
								<li class="rounded-[var(--radius-sm)] bg-muted px-3 py-2.5">
									<div class="text-sm font-semibold">{exercise.exerciseName}</div>
									<div class="text-xs text-muted-foreground">
										{exercise.sets} × {exercise.reps}
										{#if exercise.restSeconds}
											· отдых {exercise.restSeconds} с
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>

			<ModalFooter class="block">
				{@render actions('')}
			</ModalFooter>
		</ModalContent>
	</Modal>

	{@render actions('mt-3')}
</div>
