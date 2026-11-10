import {
	REALTIME_BACKOFF_MAX_MS,
	REALTIME_BACKOFF_MIN_MS,
	REALTIME_CATCH_UP_LIMIT,
	REALTIME_CATCH_UP_POLL_MS,
	REALTIME_PING_INTERVAL_MS
} from './config';
import { REALTIME_DEFAULT_SELECTION, REALTIME_EVENT_NAMES, RealtimeCatchUp, RealtimeCatchUpQuery, RealtimeEnvelope } from './events';
import { GraphqlWsConnection, isFatalCloseCode, SocketFactory } from './graphql-ws';

/** Where the tab's connection stands. */
export type RealtimeStatus = 'off' | 'connecting' | 'connected' | 'reconnecting' | 'stopped';

/** The credential and scope the socket presents, exactly as the HTTP calls present them. */
export interface RealtimeCredentials {
	accessToken: string;
	tenantId?: string | null;
	organizationId?: string | null;
}

/** The position the last catch-up answered: what the next catch-up continues from. */
export interface RealtimeCursor {
	at: number;
	id: string | null;
}

export interface RealtimeClientOptions {
	socketUrl: string;
	/** The current credential; `null` when there is none (signed out), which stops the client. */
	credentials: () => RealtimeCredentials | null;
	/** The catch-up listing (`GET /realtime/events`), through the app's own transport. */
	catchUp: (query: RealtimeCatchUpQuery) => Promise<RealtimeCatchUp>;
	/** The event names to select; the default covers every family the app consumes. */
	names?: readonly string[];
	limit?: number;
	createSocket?: SocketFactory;
	backoff?: { minMs: number; maxMs: number };
	pingIntervalMs?: number;
	/** How often a connected client reads the catch-up anyway (0: only on reconnect). */
	pollIntervalMs?: number;
	/** How long the server has to acknowledge a connection (0: no deadline). */
	ackTimeoutMs?: number;
	/** Injected for tests. */
	random?: () => number;
	setTimeout?: (fn: () => void, ms: number) => unknown;
	clearTimeout?: (handle: unknown) => void;
	/** The window to listen to for `online` and visibility, when there is one. */
	window?: Pick<Window, 'addEventListener' | 'removeEventListener'> & { document?: { visibilityState?: string } };
}

const COLLABORATION_EVENTS_SUBSCRIPTION = `subscription CollaborationEvents($names: [String!]!) {
	collaborationEvents(names: $names) {
		eventId
		eventName
		occurredAt
		aggregate { type id }
		sequence
		data
	}
}`;

/**
 * How many event ids are remembered to drop a duplicate once the client is caught up. While a replay is unfinished
 * nothing is forgotten, so every event the replay may return again is still recognised.
 */
const SEEN_LIMIT = 2_000;

/** The pages one replay reads; a larger gap is cheaper to refetch than to replay, so the listeners resynchronise. */
const REPLAY_MAX_PAGES = 50;

/** How many employees' presence revisions are remembered to drop an older `presence.changed`. */
const PRESENCE_REVISIONS_LIMIT = 5_000;

/** Whether position `a` is after position `b` (time, then id). */
function isAfter(a: RealtimeCursor, b: RealtimeCursor | null): boolean {
	return !b || a.at > b.at || (a.at === b.at && (a.id ?? '') > (b.id ?? ''));
}

type EventHandler = (envelope: RealtimeEnvelope) => void;
type StatusHandler = (status: RealtimeStatus) => void;
type ResyncHandler = () => void;

/**
 * The one live connection of a tab.
 *
 * It opens the socket with the session's credential, subscribes to the collaboration events, and replays through
 * the catch-up listing — on every reconnect, and every {@link REALTIME_CATCH_UP_POLL_MS} while connected — what it
 * has not applied, without duplicates, or tells its listeners to resynchronise when the platform no longer holds the
 * gap. **The resume position is only ever the cursor a catch-up answered**, never a streamed event: the platform
 * delivers the stream neither in commit order nor at once, so an event stamped before a streamed one can still be on
 * its way. Streamed events are applied at once all the same (they are the freshness); the catch-up answers them
 * again and they are dropped by id. A `presence.changed` older than the last one applied for its employee (a lower
 * `revision`) is dropped. Drops reconnect with jittered exponential backoff, at once when the browser reports being
 * online again or the tab becomes visible; a refused credential stops the client until a new one is given.
 *
 * Events are never data: a listener refetches what it may read.
 */
export class RealtimeClient {
	private status: RealtimeStatus = 'off';
	private connection: GraphqlWsConnection | null = null;
	private unsubscribe: (() => void) | null = null;
	private cursor: RealtimeCursor | null = null;
	private attempts = 0;
	private reconnectTimer: unknown = null;
	private started = false;
	/** Whether this connection's first replay completed (until then every event id is remembered). */
	private caughtUp = false;
	private replayRunning = false;
	private pollTimer: unknown = null;
	/** The newest presence revision applied, by employee. */
	private readonly presenceRevisions = new Map<string, number>();
	private replayAgain = false;
	/** Subscriptions the server ended in a row: the backoff of the reconnect that follows. */
	private streamEnds = 0;
	private readonly seen = new Set<string>();
	private readonly eventHandlers = new Set<EventHandler>();
	private readonly statusHandlers = new Set<StatusHandler>();
	private readonly resyncHandlers = new Set<ResyncHandler>();
	private readonly setTimer: (fn: () => void, ms: number) => unknown;
	private readonly clearTimer: (handle: unknown) => void;
	private readonly onOnline = () => this.reconnectNow();
	private readonly onVisible = () => {
		if (this.options.window?.document?.visibilityState === 'visible') this.reconnectNow();
	};

	constructor(private readonly options: RealtimeClientOptions) {
		this.setTimer = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
		this.clearTimer = options.clearTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
	}

	getStatus(): RealtimeStatus {
		return this.status;
	}

	getCursor(): RealtimeCursor | null {
		return this.cursor ? { ...this.cursor } : null;
	}

	/** Every event, streamed or replayed, exactly once. */
	on(handler: EventHandler): () => void {
		this.eventHandlers.add(handler);
		return () => void this.eventHandlers.delete(handler);
	}

	onStatus(handler: StatusHandler): () => void {
		this.statusHandlers.add(handler);
		return () => void this.statusHandlers.delete(handler);
	}

	/** The platform no longer holds what was missed: refetch through the read APIs. */
	onResync(handler: ResyncHandler): () => void {
		this.resyncHandlers.add(handler);
		return () => void this.resyncHandlers.delete(handler);
	}

	/** Opens the connection (idempotent). */
	start(): void {
		if (this.started) return;
		this.started = true;
		this.options.window?.addEventListener('online', this.onOnline);
		this.options.window?.addEventListener('visibilitychange', this.onVisible);
		this.connect();
	}

	/** Closes the connection and forgets the schedule; the cursor is kept for a later {@link start}. */
	stop(): void {
		if (!this.started) return;
		this.started = false;
		this.options.window?.removeEventListener('online', this.onOnline);
		this.options.window?.removeEventListener('visibilitychange', this.onVisible);
		this.cancelReconnect();
		this.cancelPoll();
		this.closeConnection();
		this.setStatus('off');
	}

	/** Closes and reopens at once (a new credential). */
	restart(): void {
		if (!this.started) {
			this.start();
			return;
		}
		this.cancelReconnect();
		this.cancelPoll();
		this.closeConnection();
		this.attempts = 0;
		this.connect();
	}

	private connect(): void {
		if (!this.started) return;
		const credentials = this.options.credentials();
		if (!credentials?.accessToken) {
			this.setStatus('stopped');
			return;
		}
		this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
		const connection = new GraphqlWsConnection({
			url: this.options.socketUrl,
			connectionParams: () => this.connectionParams(credentials),
			createSocket: this.options.createSocket,
			pingIntervalMs: this.options.pingIntervalMs ?? REALTIME_PING_INTERVAL_MS,
			ackTimeoutMs: this.options.ackTimeoutMs,
			setTimeout: this.setTimer,
			clearTimeout: this.clearTimer,
			onAck: () => void this.onAcknowledged(connection),
			onClose: (code) => this.onClosed(connection, code)
		});
		this.connection = connection;
	}

	private connectionParams(credentials: RealtimeCredentials): Record<string, unknown> {
		return {
			authorization: `Bearer ${credentials.accessToken}`,
			...(credentials.tenantId ? { 'tenant-id': credentials.tenantId } : {}),
			...(credentials.organizationId ? { 'organization-id': credentials.organizationId } : {})
		};
	}

	private async onAcknowledged(connection: GraphqlWsConnection): Promise<void> {
		if (this.connection !== connection || !connection.isReady) return;
		// A server that keeps ending the subscription keeps the backoff growing; a delivered event resets it.
		this.attempts = this.streamEnds;
		// Until this connection's replay completes, what was missed is unknown: the cursor stays where it is.
		this.caughtUp = false;
		// The stream first, so nothing that happens during the replay is missed; duplicates are dropped by id.
		const ended = () => {
			// The server refused or ended the subscription while the socket stays open: no event would arrive and
			// polling would stay paused. Close and reconnect (with backoff). Ignored while the socket is closing.
			if (this.connection !== connection || !connection.isReady) return;
			this.streamEnds += 1;
			this.unsubscribe = null;
			connection.close(4000, 'subscription ended');
		};
		this.unsubscribe = connection.subscribe<{ collaborationEvents: RealtimeEnvelope }>(
			{
				query: COLLABORATION_EVENTS_SUBSCRIPTION,
				variables: { names: [...(this.options.names ?? REALTIME_DEFAULT_SELECTION)] }
			},
			{
				next: (data) => {
					const envelope = data?.collaborationEvents;
					if (!envelope) return;
					this.streamEnds = 0;
					this.attempts = 0;
					this.apply(envelope);
				},
				error: ended,
				complete: ended
			}
		);
		this.setStatus('connected');
		await this.catchUp();
		this.schedulePoll(connection);
	}

	/** Reads the catch-up again while this connection lasts, so the cursor stays fresh. */
	private schedulePoll(connection: GraphqlWsConnection): void {
		const interval = this.options.pollIntervalMs ?? REALTIME_CATCH_UP_POLL_MS;
		this.cancelPoll();
		if (interval <= 0 || this.connection !== connection) return;
		this.pollTimer = this.setTimer(() => {
			this.pollTimer = null;
			if (!this.started || this.connection !== connection || !connection.isReady) return;
			void this.catchUp('poll').finally(() => this.schedulePoll(connection));
		}, interval);
	}

	private cancelPoll(): void {
		if (this.pollTimer !== null) {
			this.clearTimer(this.pollTimer);
			this.pollTimer = null;
		}
	}

	/**
	 * Replays what was missed since the cursor; without a cursor, takes the platform's own position (the client's
	 * clock may differ from the platform's). One replay runs at a time: a connection acknowledged while one runs gets
	 * its own replay right after it, from wherever the first one got to; a poll while one runs is not needed.
	 */
	private async catchUp(mode: 'reconnect' | 'poll' = 'reconnect'): Promise<void> {
		if (this.replayRunning) {
			if (mode === 'reconnect') this.replayAgain = true;
			return;
		}
		this.replayRunning = true;
		try {
			let current = mode;
			do {
				this.replayAgain = false;
				await this.replay(this.connection, current);
				current = 'reconnect';
			} while (this.replayAgain && this.started && this.connection?.isReady);
		} finally {
			this.replayRunning = false;
		}
	}

	/**
	 * One replay for one connection. It reads from the cursor the last catch-up answered and moves it only as far as
	 * it has applied everything. Superseded by a newer connection, it stops and leaves the rest to that connection's
	 * replay. A poll that fails is let go (the next poll or reconnect reads again); a reconnect's replay that fails
	 * tells the listeners to resynchronise rather than trust a gap.
	 */
	private async replay(connection: GraphqlWsConnection | null, mode: 'reconnect' | 'poll' = 'reconnect'): Promise<void> {
		const superseded = () => this.connection !== connection;
		const limit = this.options.limit ?? REALTIME_CATCH_UP_LIMIT;
		try {
			if (!this.cursor) {
				const start = await this.options.catchUp({ limit });
				if (typeof start.cursor === 'number') this.cursor = { at: start.cursor, id: start.cursorId };
				this.completeReplay();
				return;
			}
			let position: RealtimeCursor = { ...this.cursor };
			for (let page = 0; page < REPLAY_MAX_PAGES; page += 1) {
				const answer = await this.options.catchUp({ after: position.at, afterId: position.id, limit });
				for (const envelope of answer.events) this.apply(envelope);
				if (typeof answer.cursor === 'number') position = { at: answer.cursor, id: answer.cursorId };
				// Everything up to `position` is applied: the next replay, whoever runs it, continues from there.
				if (isAfter(position, this.cursor)) this.cursor = { ...position };
				if (answer.resync) {
					this.emitResync();
					this.completeReplay();
					return;
				}
				if (!answer.hasMore) {
					this.completeReplay();
					return;
				}
				if (superseded()) return;
			}
			// More is held than one replay reads: refetching is cheaper, and nothing is left silently unapplied.
			this.emitResync();
			this.completeReplay();
		} catch {
			// Superseded: the newer connection replays for itself. A failed poll leaves the cursor where it is.
			// Otherwise the listeners resynchronise rather than trust a gap.
			if (superseded() || mode === 'poll') return;
			this.emitResync();
			this.completeReplay();
		}
	}

	/** The replay is complete (or replaced by a resynchronisation): the remembered ids may be trimmed again. */
	private completeReplay(): void {
		this.caughtUp = true;
		while (this.seen.size > SEEN_LIMIT) {
			const oldest = this.seen.values().next().value;
			if (oldest === undefined) break;
			this.seen.delete(oldest);
		}
	}

	private apply(envelope: RealtimeEnvelope): void {
		if (!envelope?.eventId) return;
		if (this.seen.has(envelope.eventId)) return;
		this.remember(envelope.eventId);
		// The stream never moves the cursor (see the class): only a catch-up answer does.
		if (this.isOlderPresence(envelope)) return;
		for (const handler of this.eventHandlers) {
			try {
				handler(envelope);
			} catch {
				// A listener's failure is its own; the others still hear the event.
			}
		}
	}

	/**
	 * Whether a `presence.changed` is older than the last one applied for its employee: two platform processes may
	 * deliver two changes out of order, and the `revision` orders them. A change without a revision is applied.
	 */
	private isOlderPresence(envelope: RealtimeEnvelope): boolean {
		if (envelope.eventName !== REALTIME_EVENT_NAMES.PRESENCE_CHANGED) return false;
		const data = (envelope.data ?? {}) as { employeeId?: unknown; revision?: unknown };
		const employeeId = typeof data.employeeId === 'string' ? data.employeeId : null;
		const revision = typeof data.revision === 'number' && Number.isFinite(data.revision) ? data.revision : null;
		if (!employeeId || revision === null) return false;
		const last = this.presenceRevisions.get(employeeId);
		if (last !== undefined && revision <= last) return true;
		this.presenceRevisions.delete(employeeId);
		this.presenceRevisions.set(employeeId, revision);
		if (this.presenceRevisions.size > PRESENCE_REVISIONS_LIMIT) {
			const oldest = this.presenceRevisions.keys().next().value;
			if (oldest !== undefined) this.presenceRevisions.delete(oldest);
		}
		return false;
	}

	private remember(eventId: string): void {
		this.seen.add(eventId);
		if (this.caughtUp && this.seen.size > SEEN_LIMIT) {
			const oldest = this.seen.values().next().value;
			if (oldest !== undefined) this.seen.delete(oldest);
		}
	}

	private onClosed(connection: GraphqlWsConnection, code: number): void {
		if (this.connection !== connection) return;
		this.connection = null;
		this.unsubscribe = null;
		this.cancelPoll();
		// What arrives between now and the next replay is unknown: the cursor waits for that replay.
		this.caughtUp = false;
		if (!this.started) return;
		if (isFatalCloseCode(code)) {
			this.setStatus('stopped');
			return;
		}
		this.scheduleReconnect();
	}

	private scheduleReconnect(): void {
		this.cancelReconnect();
		this.setStatus('reconnecting');
		const { minMs, maxMs } = this.options.backoff ?? { minMs: REALTIME_BACKOFF_MIN_MS, maxMs: REALTIME_BACKOFF_MAX_MS };
		const base = Math.min(minMs * 2 ** this.attempts, maxMs);
		const random = this.options.random ?? Math.random;
		const delay = Math.round(base * (0.75 + random() * 0.5));
		this.attempts += 1;
		this.reconnectTimer = this.setTimer(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}

	/** Reconnects at once while a reconnect is pending (the browser is online again, the tab is visible). */
	private reconnectNow(): void {
		if (!this.started || this.reconnectTimer === null) return;
		this.cancelReconnect();
		this.connect();
	}

	private cancelReconnect(): void {
		if (this.reconnectTimer !== null) {
			this.clearTimer(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	private closeConnection(): void {
		const connection = this.connection;
		const unsubscribe = this.unsubscribe;
		this.connection = null;
		this.unsubscribe = null;
		// The subscription ends before the socket does, so the server sees a complete rather than a dropped stream.
		unsubscribe?.();
		connection?.close();
	}

	private setStatus(status: RealtimeStatus): void {
		if (this.status === status) return;
		this.status = status;
		for (const handler of this.statusHandlers) {
			try {
				handler(status);
			} catch {
				// A listener's failure is its own.
			}
		}
	}

	private emitResync(): void {
		for (const handler of this.resyncHandlers) {
			try {
				handler();
			} catch {
				// A listener's failure is its own.
			}
		}
	}
}
