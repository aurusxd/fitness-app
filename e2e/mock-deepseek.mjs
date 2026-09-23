import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_DEEPSEEK_PORT ?? 5174);

/** Mirrors the JSON contract the trainer asks for in tech.md §5. */
const PROGRAM = {
	title: 'E2E Fat Loss Plan',
	days: [
		{
			dayIndex: 0,
			exercises: [
				// Already in the seed, so this exercises the name-matching path.
				{ exerciseName: 'Bodyweight Squat', sets: 3, reps: '12-15', restSeconds: 60 },
				// Not in the seed, so this exercises the auto-creation path.
				{ exerciseName: 'Face Pull', sets: 3, reps: '15', restSeconds: 45 }
			]
		},
		{
			dayIndex: 2,
			exercises: [{ exerciseName: 'Plank', sets: 3, reps: '45s', restSeconds: 45 }]
		}
	]
};

function reply(content) {
	return JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] });
}

const server = createServer((request, response) => {
	if (request.method !== 'POST' || !request.url?.endsWith('/chat/completions')) {
		response.writeHead(404).end();
		return;
	}

	let raw = '';
	request.on('data', (chunk) => (raw += chunk));
	request.on('end', () => {
		let payload;
		try {
			payload = JSON.parse(raw);
		} catch {
			payload = {};
		}

		const wantsJson = payload.response_format?.type === 'json_object';
		const content = wantsJson ? JSON.stringify(PROGRAM) : 'Sounds good. Let us start easy today.';

		response.writeHead(200, { 'Content-Type': 'application/json' }).end(reply(content));
	});
});

server.listen(PORT, () => {
	console.log(`mock deepseek listening on ${PORT}`);
});
