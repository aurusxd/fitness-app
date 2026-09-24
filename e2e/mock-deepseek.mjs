import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_DEEPSEEK_PORT ?? 5174);

/** Mirrors the JSON contract the trainer asks for in tech.md §5. */
const PROGRAM = {
	title: 'Программа похудения E2E',
	days: [
		{
			dayIndex: 0,
			exercises: [
				// Already in the seed, so this exercises the name-matching path.
				{ exerciseName: 'Приседания без веса', sets: 3, reps: '12-15', restSeconds: 60 },
				// Not in the seed, so this exercises the auto-creation path.
				{ exerciseName: 'Тяга к лицу', sets: 3, reps: '15', restSeconds: 45 }
			]
		},
		{
			dayIndex: 2,
			exercises: [{ exerciseName: 'Планка', sets: 3, reps: '45 с', restSeconds: 45 }]
		}
	]
};

/** The last program request, so a test can check what the app actually sent to the model. */
let lastProgramRequest = null;

function reply(content) {
	return JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] });
}

const server = createServer((request, response) => {
	if (request.method === 'GET' && request.url === '/__last-program-request') {
		response
			.writeHead(200, { 'Content-Type': 'application/json' })
			.end(JSON.stringify(lastProgramRequest));
		return;
	}

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
		if (wantsJson) lastProgramRequest = payload;
		const content = wantsJson ? JSON.stringify(PROGRAM) : 'Хорошо, сегодня начнём спокойно.';

		response.writeHead(200, { 'Content-Type': 'application/json' }).end(reply(content));
	});
});

server.listen(PORT, () => {
	console.log(`mock deepseek listening on ${PORT}`);
});
