<script lang="ts">
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
		try {
			const response = await authFetch('/api/trainer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Something went wrong.';
				return;
			}

			messages.push(body.message as ChatMessageDto);
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			sending = false;
		}
	}
</script>

<div class="mx-auto flex h-dvh max-w-2xl flex-col px-6 py-6">
	<h1 class="mb-6 font-display text-lg font-bold">AI Coach</h1>

	<div class="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
		{#if messages.length === 0}
			<p class="text-center text-sm text-muted-foreground">
				Hey! Tell me how you're feeling today and I'll help you plan your session.
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
		<Input bind:value={draft} placeholder="Ask your coach…" disabled={sending} />
		<Button type="submit" size="icon" disabled={sending || !draft.trim()}>→</Button>
	</form>
</div>
