<script lang="ts">
	import { Button } from '$lib/ui/primitives/button';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/ui/primitives/card';
	import { Input } from '$lib/ui/primitives/input';
	import { Textarea } from '$lib/ui/primitives/textarea';
	import { Badge } from '$lib/ui/primitives/badge';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/ui/primitives/tabs';
	import { ProgressBar } from '$lib/ui/primitives/progress-bar';
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
	import { ChatBubble } from '$lib/ui/primitives/chat-bubble';
	import { CoachAvatar } from '$lib/ui/primitives/coach-avatar';
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-10">
	<h1 class="font-display text-2xl font-extrabold">Kitchen sink</h1>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Button</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="default">Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="link">Link</Button>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Badge</h2>
		<div class="flex flex-wrap gap-3">
			<Badge variant="default">Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="accent">Accent</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Card</h2>
		<Card>
			<CardHeader>
				<CardTitle>Full Body Challenge</CardTitle>
				<CardDescription>4-week body tone program</CardDescription>
			</CardHeader>
			<CardContent>
				<ProgressBar value={65} />
			</CardContent>
			<CardFooter>
				<Button>Start workout</Button>
			</CardFooter>
		</Card>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Input / Textarea</h2>
		<Input placeholder="Search workouts, plans…" />
		<Textarea placeholder="Tell your coach how you feel today…" />
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Tabs</h2>
		<Tabs value="home">
			<TabsList>
				<TabsTrigger value="home">Home</TabsTrigger>
				<TabsTrigger value="discover">Discover</TabsTrigger>
				<TabsTrigger value="report">Report</TabsTrigger>
			</TabsList>
			<TabsContent value="home">Home tab content.</TabsContent>
			<TabsContent value="discover">Discover tab content.</TabsContent>
			<TabsContent value="report">Report tab content.</TabsContent>
		</Tabs>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Modal</h2>
		<Modal>
			<ModalTrigger>
				{#snippet child({ props })}
					<Button {...props}>Open modal</Button>
				{/snippet}
			</ModalTrigger>
			<ModalContent>
				<ModalHeader>
					<ModalTitle>Delete program?</ModalTitle>
					<ModalDescription>This action cannot be undone.</ModalDescription>
				</ModalHeader>
				<ModalFooter>
					<ModalClose>
						{#snippet child({ props })}
							<Button variant="outline" {...props}>Cancel</Button>
						{/snippet}
					</ModalClose>
					<Button variant="destructive">Delete</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Chat bubble</h2>
		<div class="flex flex-col gap-4">
			<ChatBubble role="user">Quick 5-min session</ChatBubble>
			<ChatBubble role="assistant">
				Perfect. Here's a 5-minute express session you can squeeze in anywhere.
			</ChatBubble>
			<ChatBubble role="assistant" thinking>
				<span class="text-muted-foreground">Думаю над ответом…</span>
			</ChatBubble>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="font-display text-sm font-bold text-muted-foreground uppercase">Coach avatar</h2>
		<div class="flex items-center gap-4 p-1.5">
			<CoachAvatar />
			<CoachAvatar thinking />
		</div>
	</section>
</div>
