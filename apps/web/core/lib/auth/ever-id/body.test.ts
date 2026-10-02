/**
 * The public Ever ID routes read their bodies with a cap that applies while reading: a body sent without
 * Content-Length (chunked) is cut off as soon as it passes the cap instead of being buffered whole.
 */
import { readCappedJsonObject, readCappedText } from './body';

function chunked(chunks: string[]): Request {
	const encoder = new TextEncoder();
	let pulled = 0;
	const stream = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (pulled >= chunks.length) {
				controller.close();
				return;
			}
			controller.enqueue(encoder.encode(chunks[pulled]));
			pulled += 1;
		}
	});
	return new Request('https://app.example.test/api/auth/ever-id/confirm', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: stream,
		duplex: 'half'
	} as RequestInit);
}

describe('readCappedText', () => {
	it('reads a body within the cap, decoding characters split across chunks', async () => {
		const bytes = Buffer.from('{"name":"Zoë"}');
		const request = new Request('https://app.example.test/x', {
			method: 'POST',
			body: new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(bytes.subarray(0, 11));
					controller.enqueue(bytes.subarray(11));
					controller.close();
				}
			}),
			duplex: 'half'
		} as RequestInit);

		await expect(readCappedText(request, 1_024)).resolves.toBe('{"name":"Zoë"}');
	});

	it('refuses a declared length over the cap without reading', async () => {
		const request = new Request('https://app.example.test/x', {
			method: 'POST',
			headers: { 'content-length': '5000' },
			body: 'x'.repeat(10)
		});

		await expect(readCappedText(request, 1_024)).resolves.toBeNull();
	});

	it('stops reading a chunked body as soon as it passes the cap', async () => {
		const request = chunked(['a'.repeat(600), 'b'.repeat(600), 'c'.repeat(600)]);

		await expect(readCappedText(request, 1_000)).resolves.toBeNull();
	});
});

describe('readCappedJsonObject', () => {
	const json = (body: string, contentType = 'application/json') =>
		new Request('https://app.example.test/x', { method: 'POST', headers: { 'content-type': contentType }, body });

	it('reads a JSON object sent as JSON', async () => {
		await expect(readCappedJsonObject(json('{"code":"12345678"}'), 1_024)).resolves.toEqual({ code: '12345678' });
	});

	it.each([
		['sent as a plain form', json('{"code":"1"}', 'text/plain')],
		['not JSON', json('code=1')],
		['an array', json('[1,2]')],
		['empty', json('')],
		['over the cap', json(JSON.stringify({ code: 'x'.repeat(2_000) }))]
	])('refuses a body %s', async (_label, request) => {
		await expect(readCappedJsonObject(request, 1_024)).resolves.toBeNull();
	});
});
