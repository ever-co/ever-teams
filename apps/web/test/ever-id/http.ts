/**
 * Small HTTP helpers of the Ever ID test stand-ins (test-only, never part of the app).
 */
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/** The whole body, decoded once at the end (a character split across chunks stays whole). */
export async function readBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
	return Buffer.concat(chunks).toString('utf8');
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
	res.statusCode = status;
	if (body === undefined) {
		res.end();
		return;
	}
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(body));
}

/** Starts listening on a free local port; a failure rejects (and fails the test that started the server). */
export async function listen(server: Server): Promise<string> {
	await new Promise<void>((resolve, reject) => {
		const onError = (error: Error) => reject(error);
		server.once('error', onError);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', onError);
			resolve();
		});
	});
	return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function close(server: Server | null): Promise<void> {
	if (!server) return;
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
}
