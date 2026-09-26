<script lang="ts">
	import { onMount, tick } from 'svelte';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import { CoachAvatar } from '$lib/ui/primitives/coach-avatar';
	import { requestProgramDraft } from '$lib/client/trainer';
	import { ChatBubble } from '$lib/ui/primitives/chat-bubble';
	import { Input } from '$lib/ui/primitives/input';
	import { Button } from '$lib/ui/primitives/button';
	import { authFetch } from '$lib/client/telegram';
	import type { ChatMessageDto } from '$lib/types';
	import type { PageData } from './$types';
	import ProgramDraftCard from './ProgramDraftCard.svelte';

	let { data }: { data: PageData } = $props();

	let messages = $state<ChatMessageDto[]>(data.messages);
	let draft = $state('');
	let sending = $state(false);
	let errorMessage = $state<string | null>(null);
	let thread = $state<HTMLDivElement | null>(null);

	// Only messages that arrive while the chat is open get an entrance; loaded history just sits there.
	const historyIds = new Set(messages.map((message) => message.id));
	let generating = $state(false);

	// Older versions of a draft stay addable but step back behind the newest one.
	const latestDraftId = $derived(messages.findLast((message) => message.programDraft)?.id);

	/** The program is built from this conversation plus the profile, and lands in it as a draft to add. */
	async function buildProgram() {
		generating = true;
		errorMessage = null;
		scrollToLatest();

		const result = await requestProgramDraft();
		generating = false;

		if ('error' in result) {
			errorMessage = result.error;
			return;
		}

		messages.push(result.message);
		scrollToLatest();
	}

	function replaceMessage(updated: ChatMessageDto) {
		const index = messages.findIndex((message) => message.id === updated.id);
		if (index !== -1) messages[index] = updated;
	}

	/** The newest message is the one worth reading, and it lands below the fold as the thread grows. */
	async function scrollToLatest(): Promise<void> {
		await tick();
		thread?.scrollTo({ top: thread.scrollHeight });
	}

	onMount(scrollToLatest);

	async function sendMessage() {
		const content = draft.trim();
		if (!content || sending) return;

		draft = '';
		errorMessage = null;
		messages.push({
			id: -Date.now(),
			role: 'user',
			content,
			createdAt: new Date().toISOString(),
			programDraft: null,
			savedProgramId: null
		});

		sending = true;
		scrollToLatest();

		try {
			const response = await authFetch('/api/trainer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Что-то пошло не так.';
				return;
			}

			messages.push(body.message as ChatMessageDto);
			scrollToLatest();
		} catch {
			errorMessage = 'Ошибка сети. Попробуй ещё раз.';
		} finally {
			sending = false;
		}
	}
</script>

<!-- Pinned between the top of the screen and the tab bar, so the composer always rests right on the bar. -->
<div
	class="fixed inset-x-0 top-0 bottom-[var(--tab-bar-clearance,5.5rem)] mx-auto flex max-w-2xl flex-col px-6 pt-6 pb-3"
>
	<div class="mb-6 flex items-center justify-between gap-3">
		<div class="flex items-center gap-2.5">
			<CoachAvatar />
			<h1 class="font-display text-lg font-bold">ИИ-тренер</h1>
		</div>
		<Button size="sm" onclick={buildProgram} disabled={generating || sending}>
			{#if generating}
				<LoaderCircleIcon class="motion-safe:animate-spin" />
			{:else}
				<SparklesIcon />
			{/if}
			{generating ? 'Собираю…' : 'Собрать программу'}
		</Button>
	</div>

	<!-- Messages scrolling under the composer fade out instead of being cut against its edge. -->
	<div
		bind:this={thread}
		aria-live="polite"
		class="-mx-1.5 flex flex-1 flex-col gap-4 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-1rem),transparent)] px-1.5 pt-1.5 pb-4"
	>
		{#if messages.length === 0}
			<p class="text-center text-sm text-muted-foreground">
				Привет! Расскажи, где тренируешься, какой есть инвентарь, сколько раз в неделю готов
				заниматься и что беспокоит — учту это, когда буду собирать программу.
			</p>
		{/if}
		{#each messages as message (message.id)}
			<ChatBubble role={message.role} fresh={!historyIds.has(message.id)}>
				{message.content}
				{#if message.programDraft}
					<ProgramDraftCard
						message={{ ...message, programDraft: message.programDraft }}
						superseded={message.id !== latestDraftId}
						onsaved={replaceMessage}
					/>
				{/if}
			</ChatBubble>
		{/each}
		{#if sending || generating}
			<ChatBubble role="assistant" thinking fresh>
				<span role="status" class="text-muted-foreground">
					{generating ? 'Собираю программу…' : 'Думаю над ответом…'}
				</span>
			</ChatBubble>
		{/if}
	</div>

	{#if errorMessage}
		<p class="motion-fade mb-2 text-sm text-destructive">{errorMessage}</p>
	{/if}

	<form
		class="mt-2 flex items-center gap-2"
		onsubmit={(event) => {
			event.preventDefault();
			sendMessage();
		}}
	>
		<Input bind:value={draft} placeholder="Спроси тренера…" disabled={sending} />
		<Button type="submit" size="icon" aria-label="Отправить" disabled={sending || !draft.trim()}>
			{#if sending}
				<LoaderCircleIcon class="motion-safe:animate-spin" />
			{:else}
				<ArrowUpIcon />
			{/if}
		</Button>
	</form>
</div>
