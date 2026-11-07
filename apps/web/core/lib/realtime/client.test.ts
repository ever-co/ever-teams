import { RealtimeClient, RealtimeStatus } from './client';
import { RealtimeCatchUp, RealtimeCatchUpQuery, RealtimeEnvelope } from './events';
import { fakeSocketFactory, fakeTimers, flush } from './fake-socket';

function envelope(eventId: string, at: string, eventName = 'task.updated'): RealtimeEnvelope {
	return {
		eventId,
		eventName,
		occurredAt: at,
		aggregate: { type: 'task', id: 't1' },
		sequence: null,
		data: { entity: 'Task', entityId: 't1', action: 'updated' }
	};
}

function setUp(catchUpAnswers: Array<RealtimeCatchUp | Error> = []) {
	const sockets = fakeSocketFactory();
	const timers = fakeTimers();
	const catchUpCalls: RealtimeCatchUpQuery[] = [];
	const answers = [...catchUpAnswers];
	const statuses: RealtimeStatus[] = [];
	const events: string[] = [];
	let resyncs = 0;
	let token: string | null = 'token-1';
	const client = new RealtimeClient({
		socketUrl: 'wss://api.example.com/graphql',
		credentials: () => (token ? { accessToken: token, tenantId: 'ten', organizationId: 'org' } : null),
		catchUp: async (query) => {
			catchUpCalls.push(query);
			const answer = answers.shift() ?? { events: [], cursor: 5_000, cursorId: null, hasMore: false, resync: false };
			if (answer instanceof Error) throw answer;
			return answer;
		},
		createSocket: sockets.factory,
		setTimeout: timers.setTimeout,
		clearTimeout: timers.clearTimeout,
		backoff: { minMs: 100, maxMs: 1_000 },
		random: () => 0.5,
		pingIntervalMs: 0,
		limit: 2
	});
	client.onStatus((status) => statuses.push(status));
	client.on((e) => events.push(e.eventId));
	client.onResync(() => (resyncs += 1));
	return {
		client,
		sockets,
		timers,
		catchUpCalls,
		statuses,
		events,
		resyncs: () => resyncs,
		setToken: (next: string | null) => (token = next),
		/** The server accepts the latest socket. */
		async accept() {
			const socket = sockets.latest();
			socket.open();
			socket.serve({ type: 'connection_ack' });
			await flush();
			return socket;
		}
	};
}

describe('RealtimeClient', () => {
	it('connects with the credential, subscribes first, then takes the platform\'s now as its position', async () => {
		const ctx = setUp([{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false }]);
		ctx.client.start();
		expect(ctx.statuses).toEqual(['connecting']);
		const socket = await ctx.accept();
		expect(socket.sentOf('connection_init')[0]?.payload).toEqual({
			authorization: 'Bearer token-1',
			'tenant-id': 'ten',
			'organization-id': 'org'
		});
		expect(socket.sentOf('subscribe')).toHaveLength(1);
		expect(ctx.statuses).toEqual(['connecting', 'connected']);
		expect(ctx.catchUpCalls).toEqual([{ limit: 2 }]);
		expect(ctx.client.getCursor()).toEqual({ at: 1_000, id: null });
	});

	it('delivers streamed events once, advancing the cursor', async () => {
		const ctx = setUp();
		ctx.client.start();
		const socket = await ctx.accept();
		const deliver = (e: RealtimeEnvelope) => socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: e } } });
		deliver(envelope('e1', '2026-01-01T00:00:10.000Z'));
		deliver(envelope('e2', '2026-01-01T00:00:11.000Z'));
		deliver(envelope('e1', '2026-01-01T00:00:10.000Z'));
		expect(ctx.events).toEqual(['e1', 'e2']);
		expect(ctx.client.getCursor()).toEqual({ at: Date.parse('2026-01-01T00:00:11.000Z'), id: 'e2' });
	});

	it('reconnects with backoff after a drop, replays from its cursor page by page, and drops duplicates', async () => {
		const at = Date.parse('2026-01-01T00:00:11.000Z');
		const ctx = setUp([
			{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false },
			{ events: [envelope('e2', '2026-01-01T00:00:11.000Z'), envelope('e3', '2026-01-01T00:00:12.000Z')], cursor: at + 1_000, cursorId: 'e3', hasMore: true, resync: false },
			{ events: [envelope('e4', '2026-01-01T00:00:13.000Z')], cursor: at + 2_000, cursorId: 'e4', hasMore: false, resync: false }
		]);
		ctx.client.start();
		let socket = await ctx.accept();
		socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: envelope('e2', '2026-01-01T00:00:11.000Z') } } });
		socket.drop(1006);
		expect(ctx.client.getStatus()).toBe('reconnecting');
		expect(ctx.sockets.sockets).toHaveLength(1);
		ctx.timers.advance(100);
		expect(ctx.sockets.sockets).toHaveLength(2);
		socket = await ctx.accept();
		await flush();
		expect(ctx.catchUpCalls.slice(1)).toEqual([
			{ after: at, afterId: 'e2', limit: 2 },
			{ after: at + 1_000, afterId: 'e3', limit: 2 }
		]);
		expect(ctx.events).toEqual(['e2', 'e3', 'e4']);
		expect(ctx.client.getStatus()).toBe('connected');
		expect(ctx.client.getCursor()).toEqual({ at: at + 2_000, id: 'e4' });
	});

	it('tells its listeners to resynchronise when the platform no longer holds the gap, or when the listing fails', async () => {
		const ctx = setUp([
			{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false },
			{ events: [], cursor: 9_000, cursorId: null, hasMore: false, resync: true },
			new Error('listing failed')
		]);
		ctx.client.start();
		let socket = await ctx.accept();
		socket.drop(1006);
		ctx.timers.advance(100);
		socket = await ctx.accept();
		await flush();
		expect(ctx.resyncs()).toBe(1);
		expect(ctx.client.getCursor()).toEqual({ at: 9_000, id: null });
		socket.drop(1006);
		ctx.timers.advance(200);
		await ctx.accept();
		await flush();
		expect(ctx.resyncs()).toBe(2);
	});

	it('backs off exponentially up to the cap and reconnects at once when the browser is online again', async () => {
		const listeners = new Map<string, () => void>();
		const ctx = setUp();
		const client = new RealtimeClient({
			socketUrl: 'wss://api.example.com/graphql',
			credentials: () => ({ accessToken: 't' }),
			catchUp: async () => ({ events: [], cursor: 1, cursorId: null, hasMore: false, resync: false }),
			createSocket: ctx.sockets.factory,
			setTimeout: ctx.timers.setTimeout,
			clearTimeout: ctx.timers.clearTimeout,
			backoff: { minMs: 100, maxMs: 250 },
			random: () => 0.5,
			pingIntervalMs: 0,
			window: {
				addEventListener: (name: string, fn: unknown) => listeners.set(name, fn as () => void),
				removeEventListener: (name: string) => listeners.delete(name),
				document: { visibilityState: 'visible' }
			} as never
		});
		client.start();
		ctx.sockets.latest().drop(1006);
		ctx.timers.advance(99);
		expect(ctx.sockets.sockets).toHaveLength(1);
		ctx.timers.advance(1);
		expect(ctx.sockets.sockets).toHaveLength(2);
		ctx.sockets.latest().drop(1006);
		ctx.timers.advance(199);
		expect(ctx.sockets.sockets).toHaveLength(2);
		ctx.timers.advance(1);
		expect(ctx.sockets.sockets).toHaveLength(3);
		ctx.sockets.latest().drop(1006);
		// Capped at 250 ms; the online event does not wait for it.
		listeners.get('online')?.();
		expect(ctx.sockets.sockets).toHaveLength(4);
		client.stop();
		expect(listeners.size).toBe(0);
	});

	it('stops on a refused credential and reconnects with a new one', async () => {
		const ctx = setUp();
		ctx.client.start();
		ctx.sockets.latest().open();
		ctx.sockets.latest().drop(4401, 'Unauthorized');
		expect(ctx.client.getStatus()).toBe('stopped');
		expect(ctx.timers.pendingCount()).toBe(0);
		ctx.setToken('token-2');
		ctx.client.restart();
		expect(ctx.sockets.sockets).toHaveLength(2);
		const socket = await ctx.accept();
		expect(socket.sentOf('connection_init')[0]?.payload).toMatchObject({ authorization: 'Bearer token-2' });
	});

	it('does not open without a credential, and stop() closes and reports off', async () => {
		const ctx = setUp();
		ctx.setToken(null);
		ctx.client.start();
		expect(ctx.sockets.sockets).toHaveLength(0);
		expect(ctx.client.getStatus()).toBe('stopped');
		ctx.client.stop();
		expect(ctx.client.getStatus()).toBe('off');
	});
});
