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

function presence(eventId: string, employeeId: string, revision: number, status = 'active'): RealtimeEnvelope {
	return {
		eventId,
		eventName: 'presence.changed',
		occurredAt: '2026-01-01T00:00:30.000Z',
		aggregate: { type: 'employee', id: employeeId },
		sequence: null,
		data: { employeeId, userId: `u-${employeeId}`, status, revision, at: '2026-01-01T00:00:30.000Z' }
	};
}

function setUp(catchUpAnswers: Array<RealtimeCatchUp | Error | Promise<RealtimeCatchUp>> = [], options: { pollIntervalMs?: number } = {}) {
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
			const answer = await (answers.shift() ?? { events: [], cursor: 5_000, cursorId: null, hasMore: false, resync: false });
			if (answer instanceof Error) throw answer;
			return answer;
		},
		createSocket: sockets.factory,
		setTimeout: timers.setTimeout,
		clearTimeout: timers.clearTimeout,
		backoff: { minMs: 100, maxMs: 1_000 },
		random: () => 0.5,
		pingIntervalMs: 0,
		pollIntervalMs: options.pollIntervalMs ?? 0,
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

	it('delivers streamed events once, at once, without moving the cursor (only a catch-up answer does)', async () => {
		const ctx = setUp();
		ctx.client.start();
		const socket = await ctx.accept();
		const deliver = (e: RealtimeEnvelope) => socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: e } } });
		deliver(envelope('e1', '2026-01-01T00:00:10.000Z'));
		deliver(envelope('e2', '2026-01-01T00:00:11.000Z'));
		deliver(envelope('e1', '2026-01-01T00:00:10.000Z'));
		expect(ctx.events).toEqual(['e1', 'e2']);
		// The platform delivers the stream neither in commit order nor at once: an event stamped before e2 may still
		// be on its way, so the position stays the one the catch-up answered.
		expect(ctx.client.getCursor()).toEqual({ at: 5_000, id: null });
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
		// From the catch-up's own position, not from the streamed e2; e2 comes again and is dropped by id.
		expect(ctx.catchUpCalls.slice(1)).toEqual([
			{ after: 1_000, afterId: null, limit: 2 },
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

	it('survives a socket that cannot be created: the failure takes the ordinary reconnect path', async () => {
		const timers = fakeTimers();
		let calls = 0;
		const sockets = fakeSocketFactory();
		const client = new RealtimeClient({
			socketUrl: 'not a url',
			credentials: () => ({ accessToken: 't' }),
			catchUp: async () => ({ events: [], cursor: 1, cursorId: null, hasMore: false, resync: false }),
			createSocket: (url, protocol) => {
				calls += 1;
				if (calls === 1) throw new SyntaxError('invalid url');
				return sockets.factory(url, protocol);
			},
			setTimeout: timers.setTimeout,
			clearTimeout: timers.clearTimeout,
			backoff: { minMs: 100, maxMs: 1_000 },
			random: () => 0.5,
			pingIntervalMs: 0
		});
		expect(() => client.start()).not.toThrow();
		await flush();
		expect(client.getStatus()).toBe('reconnecting');
		timers.advance(100);
		expect(sockets.sockets).toHaveLength(1);
		client.stop();
	});

	it('subscribes with the non-null names list the platform declares', async () => {
		const ctx = setUp();
		ctx.client.start();
		const socket = await ctx.accept();
		const payload = socket.sentOf('subscribe')[0]?.payload as { query: string; variables: { names: string[] } };
		expect(payload.query).toContain('$names: [String!]!');
		expect(payload.variables.names.length).toBeGreaterThan(0);
	});

	it('reconnects when the server ends or refuses the subscription while the socket stays open', async () => {
		const ctx = setUp();
		ctx.client.start();
		let socket = await ctx.accept();
		socket.serve({ id: '1', type: 'complete' });
		expect(socket.closedWith?.code).toBe(4000);
		expect(ctx.client.getStatus()).toBe('reconnecting');
		ctx.timers.advance(100);
		socket = await ctx.accept();
		expect(ctx.client.getStatus()).toBe('connected');
		// Refused again: the backoff keeps growing (200 ms now), it does not restart at the minimum.
		socket.serve({ id: '1', type: 'error', payload: [{ message: 'Variable "$names" of required type' }] });
		expect(ctx.client.getStatus()).toBe('reconnecting');
		ctx.timers.advance(199);
		expect(ctx.sockets.sockets).toHaveLength(2);
		ctx.timers.advance(1);
		expect(ctx.sockets.sockets).toHaveLength(3);
	});

	it('gives a connection acknowledged during an earlier replay its own replay, from where the first got to', async () => {
		const at = Date.parse('2026-01-01T00:00:11.000Z');
		let release: (answer: RealtimeCatchUp) => void = () => undefined;
		const held = new Promise<RealtimeCatchUp>((resolve) => (release = resolve));
		const ctx = setUp([
			{ events: [], cursor: at, cursorId: 'e1', hasMore: false, resync: false },
			held,
			{ events: [envelope('e5', '2026-01-01T00:00:15.000Z')], cursor: at + 4_000, cursorId: 'e5', hasMore: false, resync: false }
		]);
		ctx.client.start();
		let socket = await ctx.accept();
		socket.drop(1006);
		ctx.timers.advance(100);
		socket = await ctx.accept();
		// The second connection's replay is pending; the socket drops again and a third one is acknowledged.
		socket.drop(1006);
		ctx.timers.advance(200);
		socket = await ctx.accept();
		release({ events: [envelope('e3', '2026-01-01T00:00:13.000Z')], cursor: at + 2_000, cursorId: 'e3', hasMore: true, resync: false });
		await flush();
		expect(ctx.catchUpCalls.slice(1)).toEqual([
			{ after: at, afterId: 'e1', limit: 2 },
			{ after: at + 2_000, afterId: 'e3', limit: 2 }
		]);
		expect(ctx.events).toEqual(['e3', 'e5']);
		expect(ctx.client.getCursor()).toEqual({ at: at + 4_000, id: 'e5' });
	});

	it('never lets a streamed event move the cursor past a gap the replay has not applied yet', async () => {
		const at = Date.parse('2026-01-01T00:00:11.000Z');
		let release: (answer: RealtimeCatchUp) => void = () => undefined;
		const held = new Promise<RealtimeCatchUp>((resolve) => (release = resolve));
		const ctx = setUp([{ events: [], cursor: at, cursorId: 'e1', hasMore: false, resync: false }, held]);
		ctx.client.start();
		let socket = await ctx.accept();
		socket.drop(1006);
		ctx.timers.advance(100);
		socket = await ctx.accept();
		// A newer event streams in while the gap is being replayed, then the socket drops before the replay ends.
		socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: envelope('e9', '2026-01-01T00:00:19.000Z') } } });
		expect(ctx.client.getCursor()).toEqual({ at, id: 'e1' });
		socket.drop(1006);
		release({ events: [envelope('e3', '2026-01-01T00:00:13.000Z')], cursor: at + 2_000, cursorId: 'e3', hasMore: true, resync: false });
		await flush();
		// Only what the replay applied counts: the next replay continues from e3, not from e9.
		expect(ctx.client.getCursor()).toEqual({ at: at + 2_000, id: 'e3' });
		ctx.timers.advance(200);
		await ctx.accept();
		await flush();
		expect(ctx.catchUpCalls[ctx.catchUpCalls.length - 1]).toEqual({ after: at + 2_000, afterId: 'e3', limit: 2 });
		// The streamed e9 never becomes the position, even once the replay completed.
		expect(ctx.client.getCursor()).toEqual({ at: at + 2_000, id: 'e3' });
	});

	describe('polling the catch-up while connected', () => {
		it('reads the catch-up again every interval, moving the cursor and filling what the stream missed', async () => {
			const at = Date.parse('2026-01-01T00:00:11.000Z');
			const ctx = setUp(
				[
					{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false },
					{ events: [envelope('e7', '2026-01-01T00:00:17.000Z')], cursor: at, cursorId: null, hasMore: false, resync: false }
				],
				{ pollIntervalMs: 60_000 }
			);
			ctx.client.start();
			await ctx.accept();
			expect(ctx.catchUpCalls).toHaveLength(1);
			ctx.timers.advance(60_000);
			await flush();
			expect(ctx.catchUpCalls[1]).toEqual({ after: 1_000, afterId: null, limit: 2 });
			expect(ctx.events).toEqual(['e7']);
			expect(ctx.client.getCursor()).toEqual({ at, id: null });
			// The next poll is scheduled once this one finished.
			ctx.timers.advance(60_000);
			await flush();
			expect(ctx.catchUpCalls).toHaveLength(3);
		});

		it('lets a failed poll go without resynchronising, and keeps polling', async () => {
			const ctx = setUp(
				[{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false }, new Error('network blip')],
				{ pollIntervalMs: 60_000 }
			);
			ctx.client.start();
			await ctx.accept();
			ctx.timers.advance(60_000);
			await flush();
			expect(ctx.resyncs()).toBe(0);
			expect(ctx.client.getCursor()).toEqual({ at: 1_000, id: null });
			ctx.timers.advance(60_000);
			await flush();
			expect(ctx.catchUpCalls).toHaveLength(3);
		});

		it('stops polling when the connection closes or the client stops', async () => {
			const ctx = setUp([], { pollIntervalMs: 60_000 });
			ctx.client.start();
			const socket = await ctx.accept();
			socket.drop(1006);
			ctx.timers.advance(50);
			ctx.client.stop();
			ctx.timers.advance(10 * 60_000);
			await flush();
			expect(ctx.catchUpCalls).toHaveLength(1);
			expect(ctx.timers.pendingCount()).toBe(0);
		});
	});

	it('keeps a poll of an earlier connection from cancelling the new connection\'s poll', async () => {
		let release: (answer: RealtimeCatchUp) => void = () => undefined;
		const held = new Promise<RealtimeCatchUp>((resolve) => (release = resolve));
		const ctx = setUp([{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false }, held], { pollIntervalMs: 60_000 });
		ctx.client.start();
		let socket = await ctx.accept();
		// The first connection's poll is waiting for its answer when the socket drops and a new one is acknowledged.
		ctx.timers.advance(60_000);
		await flush();
		socket.drop(1006);
		ctx.timers.advance(100);
		socket = await ctx.accept();
		release({ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false });
		await flush();
		const calls = ctx.catchUpCalls.length;
		// The new connection's own poll still runs.
		ctx.timers.advance(60_000);
		await flush();
		expect(ctx.catchUpCalls.length).toBe(calls + 1);
	});

	it('remembers an applied event until the catch-up cursor passes it, however many arrive meanwhile', async () => {
		const ctx = setUp([
			{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false },
			// The catch-up answers again an event the stream delivered 2,500 events earlier: still recognised.
			{ events: [envelope('s0', '2026-01-01T00:00:20.000Z')], cursor: Date.parse('2026-01-01T00:00:20.000Z'), cursorId: null, hasMore: false, resync: false },
			// Once the cursor has passed its time, nothing returns it; later events are still recognised.
			{ events: [envelope('s2499', '2026-01-01T00:00:21.000Z')], cursor: Date.parse('2026-01-01T00:00:22.000Z'), cursorId: null, hasMore: false, resync: false }
		], { pollIntervalMs: 60_000 });
		ctx.client.start();
		const socket = await ctx.accept();
		for (let i = 0; i < 2_500; i += 1) {
			const at = i === 0 ? '2026-01-01T00:00:20.000Z' : '2026-01-01T00:00:21.000Z';
			socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: envelope(`s${i}`, at) } } });
		}
		ctx.timers.advance(60_000);
		await flush();
		ctx.timers.advance(60_000);
		await flush();
		expect(ctx.events.filter((id) => id === 's0')).toHaveLength(1);
		expect(ctx.events.filter((id) => id === 's2499')).toHaveLength(1);
		expect(ctx.events).toHaveLength(2_500);
	});

	it('applies a presence change only when its revision is newer than the last one applied for the employee', async () => {
		const ctx = setUp();
		ctx.client.start();
		const socket = await ctx.accept();
		const deliver = (e: RealtimeEnvelope) => socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: e } } });
		deliver(presence('p2', 'emp-1', 2, 'idle'));
		// Two processes told two changes out of order: the older one arrives last and is dropped.
		deliver(presence('p1', 'emp-1', 1, 'active'));
		deliver(presence('p3', 'emp-1', 3, 'away'));
		// Another employee keeps a revision of their own; a change without one is applied.
		deliver(presence('q1', 'emp-2', 1));
		deliver({ ...presence('r0', 'emp-3', 0), data: { employeeId: 'emp-3', status: 'active' } });
		expect(ctx.events).toEqual(['p2', 'p3', 'q1', 'r0']);
	});

	it('resynchronises when the gap is larger than one replay reads', async () => {
		const pages: RealtimeCatchUp[] = [{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false }];
		for (let page = 0; page < 50; page += 1) pages.push({ events: [], cursor: 2_000 + page, cursorId: null, hasMore: true, resync: false });
		const ctx = setUp(pages);
		ctx.client.start();
		const socket = await ctx.accept();
		socket.drop(1006);
		ctx.timers.advance(100);
		await ctx.accept();
		for (let i = 0; i < 20; i += 1) await flush();
		expect(ctx.catchUpCalls).toHaveLength(51);
		expect(ctx.resyncs()).toBe(1);
	});

	it('still drops a duplicate when more than the remembered window streams in during a replay', async () => {
		let release: (answer: RealtimeCatchUp) => void = () => undefined;
		const held = new Promise<RealtimeCatchUp>((resolve) => (release = resolve));
		const ctx = setUp([{ events: [], cursor: 1_000, cursorId: null, hasMore: false, resync: false }, held]);
		ctx.client.start();
		let socket = await ctx.accept();
		socket.drop(1006);
		ctx.timers.advance(100);
		socket = await ctx.accept();
		for (let i = 0; i < 2_001; i += 1) {
			socket.serve({ id: '1', type: 'next', payload: { data: { collaborationEvents: envelope(`s${i}`, '2026-01-01T00:00:20.000Z') } } });
		}
		release({ events: [envelope('s0', '2026-01-01T00:00:20.000Z')], cursor: 9_000, cursorId: 's0', hasMore: false, resync: false });
		await flush();
		expect(ctx.events.filter((id) => id === 's0')).toHaveLength(1);
	});
});
