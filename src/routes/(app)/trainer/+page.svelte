<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { requestProgram } from '$lib/client/programs';
	import { ChatBubble } from '$lib/ui/primitives/chat-bubble';
	import { Input } from '$lib/ui/primitives/input';
	import { Button } from '$lib/ui/primitives/button';
	import { authFetch } from '$lib/client/telegram';
	import type { ChatMessageDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let messages = $state<ChatMessageDto[]>(data.messages);
	let draft = $state('');
	let sending = $state(false);
	let errorMessage = $state<string | null>(null);
	let thread = $state<HTMLDivElement | null>(null);
	let generating = $state(false);

	/** The program is built from this conversation plus the profile, so it is offered right here. */
	async function buildProgram() {
		generating = true;
		errorMessage = null;

		const result = await requestProgram();
		if ('error' in result) {
			errorMessage = result.error;
			generating = false;
			return;
		}

		await goto(resolve('/(app)/programs/[id]', { id: String(result.program.id) }));
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
			createdAt: new Date().toISOString()
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

<div class="mx-auto flex h-[calc(100dvh-7rem)] max-w-2xl flex-col px-6 py-6">
	<div class="mb-6 flex items-center justify-between gap-3">
		<h1 class="font-display text-lg font-bold">ИИ-тренер</h1>
		<Button size="sm" onclick={buildProgram} disabled={generating || sending}>
			<SparklesIcon />
			{generating ? 'Собираю…' : 'Собрать программу'}
		</Button>
	</div>

	<div bind:this={thread} class="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
		{#if messages.length === 0}
			<p class="text-center text-sm text-muted-foreground">
				Привет! Расскажи, где тренируешься, какой есть инвентарь, сколько раз в неделю готов
				заниматься и что беспокоит — учту это, когда буду собирать программу.
			</p>
		{/if}
		{#each messages as message (message.id)}
			<ChatBubble role={message.role}>{message.content}</ChatBubble>
		{/each}
		{#if sending}
			<ChatBubble role="assistant">…</ChatBubble>
		{/if}
	</div>

	{#if errorMessage}
		<p class="mb-2 text-sm text-destructive">{errorMessage}</p>
	{/if}

	<form
		class="flex items-center gap-2"
		onsubmit={(event) => {
			event.preventDefault();
			sendMessage();
		}}
	>
		<Input bind:value={draft} placeholder="Спроси тренера…" disabled={sending} />
		<Button type="submit" size="icon" disabled={sending || !draft.trim()}>→</Button>
	</form>
</div>
