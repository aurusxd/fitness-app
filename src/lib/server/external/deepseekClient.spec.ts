import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepseekClient } from './deepseekClient';

function stubFetch(message: object) {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
	return JSON.parse(fetchMock.mock.calls[0][1].body as string);
}

describe('DeepseekClient', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('offers the given tools as argument-free functions', async () => {
		const fetchMock = stubFetch({ content: 'ok' });
		const client = new DeepseekClient('key', 'http://deepseek.test');

		await client.chat([{ role: 'user', content: 'hi' }], {
			tools: [{ name: 'build_program', description: 'Собрать программу' }]
		});

		expect(sentBody(fetchMock).tools).toEqual([
			{
				type: 'function',
				function: {
					name: 'build_program',
					description: 'Собрать программу',
					parameters: { type: 'object', properties: {} }
				}
			}
		]);
	});

	it('sends no tools when none are given', async () => {
		const fetchMock = stubFetch({ content: 'ok' });
		const client = new DeepseekClient('key', 'http://deepseek.test');

		await client.chat([{ role: 'user', content: 'hi' }]);

		expect(sentBody(fetchMock)).not.toHaveProperty('tools');
	});

	it('reports the tools the model called, with empty text when it wrote none', async () => {
		stubFetch({
			content: null,
			tool_calls: [
				{ id: 'call_1', type: 'function', function: { name: 'build_program', arguments: '{}' } }
			]
		});
		const client = new DeepseekClient('key', 'http://deepseek.test');

		const response = await client.chat([{ role: 'user', content: 'Составь программу' }]);

		expect(response).toEqual({ content: '', toolCalls: ['build_program'] });
	});
});
