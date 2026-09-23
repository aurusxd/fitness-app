<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/ui/primitives/card';
	import { Badge } from '$lib/ui/primitives/badge';
	import { Button } from '$lib/ui/primitives/button';
	import { authFetch } from '$lib/client/telegram';
	import type { WorkoutProgramDto } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let programs = $state<WorkoutProgramDto[]>(data.programs);
	let generating = $state(false);
	let errorMessage = $state<string | null>(null);

	async function generateProgram() {
		generating = true;
		errorMessage = null;
		try {
			const response = await authFetch('/api/programs', { method: 'POST' });
			const body = await response.json();

			if (!response.ok) {
				errorMessage = body.error ?? 'Something went wrong.';
				return;
			}

			const program = body.program as WorkoutProgramDto;
			programs = [program, ...programs];
			await goto(resolve('/(app)/programs/[id]', { id: String(program.id) }));
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			generating = false;
		}
	}
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-display text-lg font-bold">My Programs</h1>
		<Button onclick={generateProgram} disabled={generating}>
			{generating ? 'Generating…' : 'Generate program'}
		</Button>
	</div>

	{#if errorMessage}
		<p class="text-sm text-destructive">{errorMessage}</p>
	{/if}

	{#if programs.length === 0}
		<p class="text-center text-sm text-muted-foreground">
			No programs yet. Generate one based on your profile.
		</p>
	{/if}

	<div class="flex flex-col gap-3">
		{#each programs as program (program.id)}
			<a href={resolve('/(app)/programs/[id]', { id: String(program.id) })}>
				<Card class="transition-colors hover:bg-secondary">
					<CardHeader>
						<div class="flex items-center justify-between">
							<CardTitle>{program.title}</CardTitle>
							<Badge variant={program.source === 'ai_generated' ? 'default' : 'secondary'}>
								{program.source === 'ai_generated' ? 'AI' : 'Manual'}
							</Badge>
						</div>
						<CardDescription>
							{program.days.length} day{program.days.length === 1 ? '' : 's'} · {program.days.reduce(
								(total, day) => total + day.exercises.length,
								0
							)} exercises
						</CardDescription>
					</CardHeader>
				</Card>
			</a>
		{/each}
	</div>
</div>
