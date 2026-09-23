<script lang="ts">
	import { Card, CardContent } from '$lib/ui/primitives/card';
	import { Button } from '$lib/ui/primitives/button';
	import { Textarea } from '$lib/ui/primitives/textarea';
	import { Badge } from '$lib/ui/primitives/badge';
	import { authFetch } from '$lib/client/telegram';
	import type { UserGoal, UserLevel, UserProfileDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const GOALS: { value: UserGoal; label: string }[] = [
		{ value: 'lose', label: 'Lose fat' },
		{ value: 'maintain', label: 'Maintain' },
		{ value: 'gain', label: 'Gain muscle' }
	];

	const LEVELS: { value: UserLevel; label: string }[] = [
		{ value: 'beginner', label: 'Beginner' },
		{ value: 'intermediate', label: 'Intermediate' },
		{ value: 'advanced', label: 'Advanced' }
	];

	let profile = $state<UserProfileDto>(data.profile);
	let goal = $state<UserGoal | null>(data.profile.goal);
	let level = $state<UserLevel | null>(data.profile.level);
	let constraints = $state(data.profile.constraints ?? '');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);
	let savedAt = $state<number | null>(null);

	async function save() {
		if (!goal || !level) {
			errorMessage = 'Pick a goal and a level first.';
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
				errorMessage = body.error ?? 'Could not save your profile.';
				return;
			}

			profile = body.profile as UserProfileDto;
			savedAt = Date.now();
		} catch {
			errorMessage = 'Network error. Please try again.';
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
			<h1 class="font-display text-lg font-extrabold">{profile.username ?? 'Athlete'}</h1>
			{#if profile.isComplete}
				<p class="mt-1 text-xs text-muted-foreground">Profile complete</p>
			{:else}
				<Badge variant="accent" class="mt-1.5">Finish your profile</Badge>
			{/if}
		</div>
	</div>

	<Card>
		<CardContent class="flex flex-col gap-5 p-5">
			<fieldset class="flex flex-col gap-2">
				<legend class="mb-2 font-display text-sm font-bold">Goal</legend>
				<div class="flex gap-2">
					{#each GOALS as option (option.value)}
						<Button
							variant={goal === option.value ? 'default' : 'secondary'}
							size="sm"
							class="flex-1"
							onclick={() => (goal = option.value)}
						>
							{option.label}
						</Button>
					{/each}
				</div>
			</fieldset>

			<fieldset class="flex flex-col gap-2">
				<legend class="mb-2 font-display text-sm font-bold">Level</legend>
				<div class="flex gap-2">
					{#each LEVELS as option (option.value)}
						<Button
							variant={level === option.value ? 'default' : 'secondary'}
							size="sm"
							class="flex-1"
							onclick={() => (level = option.value)}
						>
							{option.label}
						</Button>
					{/each}
				</div>
			</fieldset>

			<label class="flex flex-col gap-2">
				<span class="font-display text-sm font-bold">Injuries and limits</span>
				<Textarea
					bind:value={constraints}
					placeholder="Sensitive left knee, no overhead pressing…"
				/>
			</label>

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}

			<div class="flex items-center gap-3">
				<Button onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
				{#if savedAt}
					<span class="text-xs text-primary">Saved</span>
				{/if}
			</div>
		</CardContent>
	</Card>

	<p class="text-center text-xs text-muted-foreground">
		The AI trainer builds your programs from these answers.
	</p>
</div>
