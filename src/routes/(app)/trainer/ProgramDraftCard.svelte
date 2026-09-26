<script lang="ts">
	import { resolve } from '$app/paths';
	import CheckIcon from '@lucide/svelte/icons/check';
	import DumbbellIcon from '@lucide/svelte/icons/dumbbell';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/ui/primitives/button';
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

	let saving = $state(false);
	let errorMessage = $state<string | null>(null);

	const draft = $derived(message.programDraft);
	const days = $derived(
		[...draft.days]
			.sort((a, b) => a.dayIndex - b.dayIndex)
			.map((day) => WEEKDAYS_SHORT[day.dayIndex])
			.join(' · ')
	);
	const exerciseCount = $derived(draft.days.reduce((sum, day) => sum + day.exercises.length, 0));

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

<div
	class={cn(
		'mt-3 rounded-xl border border-primary/25 bg-background/40 p-3 transition-opacity duration-200',
		superseded && message.savedProgramId === null && 'opacity-60'
	)}
>
	{#if superseded && message.savedProgramId === null}
		<p class="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
			Предыдущая версия
		</p>
	{/if}
	<div class="flex items-start gap-2">
		<DumbbellIcon class="mt-0.5 size-4 shrink-0 text-primary" />
		<p class="font-display leading-snug font-bold">{draft.title}</p>
	</div>
	<p class="mt-1 text-xs text-muted-foreground">
		{days} · {plural(exerciseCount, ['упражнение', 'упражнения', 'упражнений'])}
	</p>

	{#if message.savedProgramId !== null}
		<div class="motion-fade mt-3 flex items-center justify-between gap-2">
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
		<Button class="mt-3 w-full" size="sm" onclick={add} disabled={saving}>
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
</div>
