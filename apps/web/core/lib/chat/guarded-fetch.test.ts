/**
 * The fetch the chat's custom provider uses re-checks the address at connect time (a host name can
 * resolve differently between the URL check and the request: DNS rebinding) and never follows a
 * redirect (a public endpoint could redirect the POST to a private one). Exercised against a real
 * HTTP server on 127.0.0.1: it plays the "private" target, so a request it receives is a request the
 * guard let through.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createGuardedFetch } from './guarded-fetch';

type Received = { method?: string; url?: string; headers: IncomingMessage['headers']; body: string };
type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const received: Received[] = [];
let handler: Handler;
let server: Server;
let port: number;

beforeAll(async () => {
	server = createServer((req, res) => {
		let body = '';
		req.setEncoding('utf8');
		req.on('data', (chunk: string) => (body += chunk));
		req.on('end', () => {
			received.push({ method: req.method, url: req.url, headers: req.headers, body });
			handler(req, res);
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
	received.length = 0;
	handler = (_req, res) => {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end('{"ok":true}');
	};
});

function chatCompletion(guardedFetch: typeof fetch, origin: string) {
	return guardedFetch(`${origin}/v1/chat/completions`, {
		method: 'POST',
		headers: { authorization: 'Bearer sk-test', 'content-type': 'application/json' },
		body: '{"model":"m"}'
	});
}

describe('createGuardedFetch', () => {
	it('refuses, at connect time, a host name that resolves to a loopback address', async () => {
		const origin = `http://localhost:${port}`;
		const guardedFetch = createGuardedFetch({ baseURL: `${origin}/v1`, allowLoopback: false });

		await expect(chatCompletion(guardedFetch, origin)).rejects.toThrow();
		expect(received).toHaveLength(0);
	});

	it('refuses a blocked IP-literal host (no DNS lookup happens for one)', async () => {
		const origin = `http://127.0.0.1:${port}`;
		const guardedFetch = createGuardedFetch({ baseURL: `${origin}/v1`, allowLoopback: false });

		await expect(chatCompletion(guardedFetch, origin)).rejects.toThrow();
		expect(received).toHaveLength(0);
	});

	it('refuses a URL outside the checked origin', async () => {
		const guardedFetch = createGuardedFetch({ baseURL: `http://127.0.0.1:${port}/v1`, allowLoopback: true });

		await expect(chatCompletion(guardedFetch, `http://localhost:${port}`)).rejects.toThrow();
		expect(received).toHaveLength(0);
	});

	it('sends the method, headers and body, and streams the response back', async () => {
		handler = (_req, res) => {
			res.writeHead(200, { 'content-type': 'text/event-stream' });
			res.write('data: {"delta":"Hel"}\n\n');
			setTimeout(() => res.end('data: [DONE]\n\n'), 10);
		};
		const origin = `http://127.0.0.1:${port}`;
		const guardedFetch = createGuardedFetch({ baseURL: `${origin}/v1`, allowLoopback: true });

		const response = await chatCompletion(guardedFetch, origin);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/event-stream');
		expect(await response.text()).toBe('data: {"delta":"Hel"}\n\ndata: [DONE]\n\n');
		expect(received).toHaveLength(1);
		expect(received[0]).toMatchObject({
			method: 'POST',
			url: '/v1/chat/completions',
			body: '{"model":"m"}',
			headers: expect.objectContaining({ authorization: 'Bearer sk-test', 'content-type': 'application/json' })
		});
	});

	it('returns a redirect as is instead of following it', async () => {
		handler = (_req, res) => {
			res.writeHead(307, { location: `http://127.0.0.1:${port}/elsewhere` });
			res.end();
		};
		const origin = `http://127.0.0.1:${port}`;
		const guardedFetch = createGuardedFetch({ baseURL: `${origin}/v1`, allowLoopback: true });

		const response = await chatCompletion(guardedFetch, origin);

		expect(response.status).toBe(307);
		expect(received.map((request) => request.url)).toEqual(['/v1/chat/completions']);
	});

	it('honours an aborted signal', async () => {
		const origin = `http://127.0.0.1:${port}`;
		const guardedFetch = createGuardedFetch({ baseURL: `${origin}/v1`, allowLoopback: true });
		const controller = new AbortController();
		controller.abort();

		await expect(guardedFetch(`${origin}/v1/models`, { signal: controller.signal })).rejects.toThrow();
	});
});
