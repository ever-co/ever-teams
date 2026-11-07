import type { SocketFactory, SocketLike } from './graphql-ws';

/**
 * A scripted WebSocket for the specs: it records what the client sends and lets a test play the server
 * (`open()`, `serve(message)`, `drop(code)`).
 */
export class FakeSocket implements SocketLike {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 3;

	readyState = FakeSocket.CONNECTING;
	readonly sent: Array<Record<string, unknown>> = [];
	closedWith: { code?: number; reason?: string } | null = null;
	onopen: ((event: unknown) => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: ((event: { code: number; reason: string }) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;

	constructor(
		readonly url: string,
		readonly protocol: string
	) {}

	send(data: string): void {
		if (this.readyState !== FakeSocket.OPEN) throw new Error('socket not open');
		this.sent.push(JSON.parse(data));
	}

	close(code?: number, reason?: string): void {
		if (this.readyState === FakeSocket.CLOSED) return;
		this.readyState = FakeSocket.CLOSED;
		this.closedWith = { code, reason };
	}

	/** The server accepted the socket. */
	open(): void {
		this.readyState = FakeSocket.OPEN;
		this.onopen?.({});
	}

	/** The server sent a message. */
	serve(message: Record<string, unknown>): void {
		this.onmessage?.({ data: JSON.stringify(message) });
	}

	/** The server (or the network) closed the socket. */
	drop(code = 1006, reason = ''): void {
		if (this.readyState === FakeSocket.CLOSED) return;
		this.readyState = FakeSocket.CLOSED;
		this.onclose?.({ code, reason });
	}

	/** The messages of one type the client sent. */
	sentOf(type: string): Array<Record<string, unknown>> {
		return this.sent.filter((message) => message.type === type);
	}
}

/** A factory that keeps every socket it made, so a test can play the server on the latest one. */
export function fakeSocketFactory(): { factory: SocketFactory; sockets: FakeSocket[]; latest(): FakeSocket } {
	const sockets: FakeSocket[] = [];
	return {
		sockets,
		factory: (url, protocol) => {
			const socket = new FakeSocket(url, protocol);
			sockets.push(socket);
			return socket;
		},
		latest: () => sockets[sockets.length - 1]
	};
}

/** Timers a test drives by hand. */
export function fakeTimers() {
	let now = 0;
	let nextHandle = 1;
	const pending = new Map<number, { at: number; fn: () => void }>();
	return {
		setTimeout: (fn: () => void, ms: number) => {
			const handle = nextHandle++;
			pending.set(handle, { at: now + ms, fn });
			return handle;
		},
		clearTimeout: (handle: unknown) => void pending.delete(handle as number),
		/** Moves time forward, running what came due in order. */
		advance(ms: number) {
			const until = now + ms;
			for (;;) {
				const due = [...pending.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
				if (!due) break;
				pending.delete(due[0]);
				now = due[1].at;
				due[1].fn();
			}
			now = until;
		},
		pendingCount: () => pending.size,
		now: () => now
	};
}

/** Lets the promise callbacks queued so far run. */
export const flush = async (): Promise<void> => {
	for (let i = 0; i < 25; i += 1) await Promise.resolve();
};
