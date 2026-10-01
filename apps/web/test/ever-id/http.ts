/**
 * Small HTTP helpers of the Ever ID test stand-ins (test-only, never part of the app).
 */
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export async function readBody(req: IncomingMessage): Promise<string> {
	let data = '';
	for await (const chunk of req) data += chunk;
	return data;
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

export async function listen(server: Server): Promise<string> {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function close(server: Server | null): Promise<void> {
	if (!server) return;
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
}
