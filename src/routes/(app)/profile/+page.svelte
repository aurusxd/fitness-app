<script lang="ts">
	import { Card, CardContent } from '$lib/ui/primitives/card';
	import { Button } from '$lib/ui/primitives/button';
	import { Textarea } from '$lib/ui/primitives/textarea';
	import { Badge } from '$lib/ui/primitives/badge';
	import { authFetch } from '$lib/client/telegram';
	import { GOAL_LABELS, LEVEL_LABELS } from '$lib/utils';
	import type { UserGoal, UserLevel, UserProfileDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const GOALS = Object.entries(GOAL_LABELS) as [UserGoal, string][];
	const LEVELS = Object.entries(LEVEL_LABELS) as [UserLevel, string][];

	let profile = $state<UserProfileDto>(data.profile);
	let goal = $state<UserGoal | null>(data.profile.goal);
	let level = $state<UserLevel | null>(data.profile.level);
	let constraints = $state(data.profile.constraints ?? '');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);
	let savedAt = $state<number | null>(null);

	async function save() {
		if (!goal || !level) {
			errorMessage = 'Сначала выбери цель и уровень.';
			return;
		}

		saving = true;
		errorMessage = null;

		try {
			const response = await authFetch('/api/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ goal, level, constraints: constraints.trim() || null })
			});

			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Не удалось сохранить профиль.';
				return;
			}

			profile = body.profile as UserProfileDto;
			savedAt = Date.now();
		} catch {
			errorMessage = 'Ошибка сети. Попробуй ещё раз.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<div class="flex flex-col items-center gap-3">
		<div
			class="size-20 rounded-full border-2 border-border bg-gradient-to-br from-[#3a5d45] to-[#16241b]"
		></div>
		<div class="text-center">
			<h1 class="font-display text-lg font-extrabold">{profile.username ?? 'Спортсмен'}</h1>
			{#if profile.isComplete}
				<p class="mt-1 text-xs text-muted-foreground">Профиль заполнен</p>
			{:else}
				<Badge variant="accent" class="mt-1.5">Заполни профиль</Badge>
			{/if}
		</div>
	</div>

	<Card>
		<CardContent class="flex flex-col gap-5 p-5">
			<fieldset class="flex flex-col gap-2">
				<legend class="mb-2 font-display text-sm font-bold">Цель</legend>
				<div class="flex flex-wrap gap-2">
					{#each GOALS as [value, label] (value)}
						<Button
							variant={goal === value ? 'default' : 'secondary'}
							size="sm"
							onclick={() => (goal = value)}
						>
							{label}
						</Button>
					{/each}
				</div>
			</fieldset>

			<fieldset class="flex flex-col gap-2">
				<legend class="mb-2 font-display text-sm font-bold">Уровень</legend>
				<div class="flex flex-wrap gap-2">
					{#each LEVELS as [value, label] (value)}
						<Button
							variant={level === value ? 'default' : 'secondary'}
							size="sm"
							onclick={() => (level = value)}
						>
							{label}
						</Button>
					{/each}
				</div>
			</fieldset>

			<label class="flex flex-col gap-2">
				<span class="font-display text-sm font-bold">Травмы и ограничения</span>
				<Textarea
					bind:value={constraints}
					placeholder="Больное левое колено, без жимов над головой…"
				/>
			</label>

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}

			<div class="flex items-center gap-3">
				<Button onclick={save} disabled={saving}
					>{saving ? 'Сохраняю…' : 'Сохранить профиль'}</Button
				>
				{#if savedAt}
					<span class="motion-fade text-xs text-primary">Сохранено</span>
				{/if}
			</div>
		</CardContent>
	</Card>

	<p class="text-center text-xs text-muted-foreground">
		ИИ-тренер собирает программы по этим ответам.
	</p>
</div>
