import { REALTIME_BACKOFF_MAX_MS, REALTIME_BACKOFF_MIN_MS, REALTIME_CATCH_UP_LIMIT, REALTIME_PING_INTERVAL_MS } from './config';
import { occurredAtMs, REALTIME_DEFAULT_SELECTION, RealtimeCatchUp, RealtimeCatchUpQuery, RealtimeEnvelope } from './events';
import { GraphqlWsConnection, isFatalCloseCode, SocketFactory } from './graphql-ws';

/** Where the tab's connection stands. */
export type RealtimeStatus = 'off' | 'connecting' | 'connected' | 'reconnecting' | 'stopped';

/** The credential and scope the socket presents, exactly as the HTTP calls present them. */
export interface RealtimeCredentials {
	accessToken: string;
	tenantId?: string | null;
	organizationId?: string | null;
}

/** The position of the newest event applied: what the catch-up continues from. */
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
	/** Injected for tests. */
	random?: () => number;
	setTimeout?: (fn: () => void, ms: number) => unknown;
	clearTimeout?: (handle: unknown) => void;
	/** The window to listen to for `online` and visibility, when there is one. */
	window?: Pick<Window, 'addEventListener' | 'removeEventListener'> & { document?: { visibilityState?: string } };
}

const COLLABORATION_EVENTS_SUBSCRIPTION = `subscription CollaborationEvents($names: [String!]) {
	collaborationEvents(names: $names) {
		eventId
		eventName
		occurredAt
		aggregate { type id }
		sequence
		data
	}
}`;

/** How many event ids are remembered to drop a duplicate (a replay that overlaps the stream). */
const SEEN_LIMIT = 2_000;

type EventHandler = (envelope: RealtimeEnvelope) => void;
type StatusHandler = (status: RealtimeStatus) => void;
type ResyncHandler = () => void;

/**
 * The one live connection of a tab.
 *
 * It opens the socket with the session's credential, subscribes to the collaboration events, remembers the
 * position of the newest event applied, and on every reconnect replays what it missed through the catch-up
 * listing — in order, without duplicates — or tells its listeners to resynchronise when the platform no longer
 * holds the gap. Drops reconnect with jittered exponential backoff, at once when the browser reports being
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
	private catchingUp = false;
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
		this.attempts = 0;
		// The stream first, so nothing that happens during the replay is missed; duplicates are dropped by id.
		this.unsubscribe = connection.subscribe<{ collaborationEvents: RealtimeEnvelope }>(
			{
				query: COLLABORATION_EVENTS_SUBSCRIPTION,
				variables: { names: [...(this.options.names ?? REALTIME_DEFAULT_SELECTION)] }
			},
			{
				next: (data) => {
					const envelope = data?.collaborationEvents;
					if (envelope) this.apply(envelope);
				},
				error: () => {
					// The subscription itself was refused: the socket close that follows (or the next reconnect)
					// decides what happens; nothing to apply.
				},
				complete: () => undefined
			}
		);
		this.setStatus('connected');
		await this.catchUp();
	}

	/**
	 * Replays what was missed since the cursor; without a cursor, takes the platform's own "now" as the position
	 * (the client's clock may differ from the platform's).
	 */
	private async catchUp(): Promise<void> {
		if (this.catchingUp) return;
		this.catchingUp = true;
		const limit = this.options.limit ?? REALTIME_CATCH_UP_LIMIT;
		try {
			if (!this.cursor) {
				const start = await this.options.catchUp({ limit });
				if (typeof start.cursor === 'number') this.cursor = { at: start.cursor, id: start.cursorId };
				return;
			}
			for (let page = 0; page < 50; page += 1) {
				const answer = await this.options.catchUp({ after: this.cursor.at, afterId: this.cursor.id, limit });
				for (const envelope of answer.events) this.apply(envelope);
				if (typeof answer.cursor === 'number') this.cursor = { at: answer.cursor, id: answer.cursorId };
				if (answer.resync) {
					this.emitResync();
					return;
				}
				if (!answer.hasMore) return;
			}
		} catch {
			// The listing failed: nothing is advanced, and the listeners resynchronise rather than trust a gap.
			this.emitResync();
		} finally {
			this.catchingUp = false;
		}
	}

	private apply(envelope: RealtimeEnvelope): void {
		if (!envelope?.eventId) return;
		if (this.seen.has(envelope.eventId)) return;
		this.remember(envelope.eventId);
		const at = occurredAtMs(envelope);
		if (at !== null && (!this.cursor || at > this.cursor.at || (at === this.cursor.at && (this.cursor.id ?? '') < envelope.eventId))) {
			this.cursor = { at, id: envelope.eventId };
		}
		for (const handler of this.eventHandlers) {
			try {
				handler(envelope);
			} catch {
				// A listener's failure is its own; the others still hear the event.
			}
		}
	}

	private remember(eventId: string): void {
		this.seen.add(eventId);
		if (this.seen.size > SEEN_LIMIT) {
			const oldest = this.seen.values().next().value;
			if (oldest !== undefined) this.seen.delete(oldest);
		}
	}

	private onClosed(connection: GraphqlWsConnection, code: number): void {
		if (this.connection !== connection) return;
		this.connection = null;
		this.unsubscribe = null;
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
		this.connection = null;
		this.unsubscribe = null;
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
