<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/ui/primitives/card';
	import { Badge } from '$lib/ui/primitives/badge';
	import { Button } from '$lib/ui/primitives/button';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		Modal,
		ModalContent,
		ModalHeader,
		ModalTitle,
		ModalDescription,
		ModalFooter,
		ModalClose
	} from '$lib/ui/primitives/modal';
	import { deleteProgram, requestProgram } from '$lib/client/programs';
	import type { WorkoutProgramDto } from '$lib/types';
	import { plural } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let programs = $state<WorkoutProgramDto[]>(data.programs);
	let generating = $state(false);
	let errorMessage = $state<string | null>(null);

	async function generateProgram() {
		generating = true;
		errorMessage = null;

		const result = await requestProgram();
		if ('error' in result) {
			errorMessage = result.error;
			generating = false;
			return;
		}

		programs = [result.program, ...programs];
		await goto(resolve('/(app)/programs/[id]', { id: String(result.program.id) }));
		generating = false;
	}

	let pendingDelete = $state<WorkoutProgramDto | null>(null);
	let confirmOpen = $state(false);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	function askToDelete(program: WorkoutProgramDto) {
		pendingDelete = program;
		deleteError = null;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		deleting = true;
		deleteError = null;

		const target = pendingDelete;
		const result = await deleteProgram(target.id);
		deleting = false;

		if ('error' in result) {
			deleteError = result.error;
			return;
		}

		confirmOpen = false;
		programs = programs.filter((program) => program.id !== target.id);
	}

	// The removed card fades while the rest close the gap; with reduced motion both are instant.
	const leave = $derived(prefersReducedMotion.current ? 0 : 160);
	const reflow = $derived(prefersReducedMotion.current ? 0 : 260);
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-display text-lg font-bold">Мои программы</h1>
		<Button onclick={generateProgram} disabled={generating}>
			{#if generating}
				<LoaderCircleIcon class="motion-safe:animate-spin" />
			{:else}
				<SparklesIcon />
			{/if}
			{generating ? 'Собираю…' : 'Собрать программу'}
		</Button>
	</div>

	{#if errorMessage}
		<p class="motion-fade text-sm text-destructive">{errorMessage}</p>
	{/if}

	{#if programs.length === 0}
		<p class="text-center text-sm text-muted-foreground">
			Программ пока нет. Собери первую по своему профилю.
		</p>
	{/if}

	<div class="flex flex-col gap-3">
		{#each programs as program (program.id)}
			<div
				class="relative"
				out:fade={{ duration: leave }}
				animate:flip={{ duration: reflow, easing: cubicOut }}
			>
				<a href={resolve('/(app)/programs/[id]', { id: String(program.id) })} class="block">
					<Card class="transition-colors hover:bg-secondary">
						<CardHeader>
							<div class="flex items-start justify-between gap-3">
								<CardTitle class="min-w-0">{program.title}</CardTitle>
								<Badge
									variant={program.source === 'ai_generated' ? 'default' : 'secondary'}
									class="shrink-0"
								>
									{program.source === 'ai_generated' ? 'ИИ' : 'Вручную'}
								</Badge>
							</div>
							<CardDescription>
								{plural(program.days.length, ['день', 'дня', 'дней'])} · {plural(
									program.days.reduce((total, day) => total + day.exercises.length, 0),
									['упражнение', 'упражнения', 'упражнений']
								)}
							</CardDescription>
						</CardHeader>
					</Card>
				</a>
				<!-- A sibling of the link, not inside it: a tap here must never open the program. -->
				<Button
					variant="ghost"
					size="icon"
					class="absolute right-2.5 bottom-2.5 text-muted-foreground hover:text-destructive"
					aria-label={`Удалить «${program.title}»`}
					onclick={() => askToDelete(program)}
				>
					<TrashIcon />
				</Button>
			</div>
		{/each}
	</div>
</div>

<Modal bind:open={confirmOpen}>
	<ModalContent>
		<ModalHeader>
			<ModalTitle>Удалить программу?</ModalTitle>
			<ModalDescription>
				«{pendingDelete?.title}» пропадёт из списка. Тренировки, которые ты по ней отметил,
				останутся в журнале.
			</ModalDescription>
		</ModalHeader>

		{#if deleteError}
			<p class="motion-fade mt-4 text-sm text-destructive">{deleteError}</p>
		{/if}

		<ModalFooter class="mt-6">
			<ModalClose>
				{#snippet child({ props })}
					<Button variant="outline" {...props}>Отмена</Button>
				{/snippet}
			</ModalClose>
			<Button variant="destructive" onclick={confirmDelete} disabled={deleting}>
				{#if deleting}
					<LoaderCircleIcon class="motion-safe:animate-spin" />
				{/if}
				{deleting ? 'Удаляю…' : 'Удалить'}
			</Button>
		</ModalFooter>
	</ModalContent>
</Modal>
