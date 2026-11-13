import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import {
	DOCS_LIVE_BACKOFF_MAX_MS,
	DOCS_LIVE_BACKOFF_MIN_MS,
	DOCS_LIVE_AWARENESS_MS,
	DOCS_LIVE_BATCH_MS,
	DOCS_LIVE_CONFIRM_TIMEOUT_MS,
	DOCS_LIVE_FIELD,
	DOCS_LIVE_REMEMBERED_PAGES,
	DOCS_LIVE_SYNC_TIMEOUT_MS
} from './config';
import {
	DOCS_LIVE_READ_ONLY,
	DOCS_LIVE_REASONS,
	DOCS_LIVE_SESSION_NOT_FOUND,
	DOCS_LIVE_TOO_LARGE,
	DOCS_LIVE_UPDATE_INVALID,
	DOCS_LIVE_USER_LIMIT,
	fromBase64,
	toBase64,
	type DocsLiveFrame,
	type DocsLiveStatus
} from './protocol';
import { unknownTypesInFragment, unknownTypesInUpdate, type DocsLiveSchemaTypes } from './schema-guard';

/** The origin of everything the platform sent: never sent back. */
const DOCS_LIVE_REMOTE = Symbol('docs-live-remote');

/**
 * Where a page's live session stands.
 * - `connecting`: asking the platform, or waiting for the first state; the editor is not shown yet.
 * - `live`: the editor is bound to the shared document.
 * - `reconnecting`: the session dropped; the editor stays writable and what is typed is sent once it is back.
 * - `fallback`: live editing stopped (the platform has none, the session closed, the page holds content this editor
 *   cannot carry): the page is read again and saved by the autosave, as without live editing.
 */
export type DocsLiveState = 'connecting' | 'live' | 'reconnecting' | 'fallback';

/** Why live editing stopped: a reason of the platform's `closed` frame, or one of these. */
export type DocsLiveFallbackReason = 'unavailable' | 'user_limit' | 'timeout' | 'unsupported' | (string & {});

/** Who this tab is, as its co-editors see it (the awareness `user` field the caret plugin reads). */
export interface DocsLiveUser {
	id: string;
	name: string;
	/** A six-digit hex color (`#2563eb`): the caret plugin draws no other kind. */
	color: string;
	imageUrl?: string | null;
}

/** Someone else with the page open. */
export interface DocsLivePeer {
	id: string;
	name: string;
	color: string;
	imageUrl: string | null;
}

export interface DocsLiveSnapshot {
	state: DocsLiveState;
	/** The first state of the session arrived: an editor may be bound to `doc`. */
	synced: boolean;
	readOnly: boolean;
	/** Why the session is read-only (`no_write_access`, `locked`, `session_limit`, `size_limit`). */
	readOnlyReason: string | null;
	fallbackReason: DocsLiveFallbackReason | null;
	/** With `fallbackReason: 'unsupported'`: the node and mark types the editor does not know. */
	unsupportedTypes: string[];
	/**
	 * Edits made here that the platform has not confirmed (waiting, refused while read-only, typed while the session was
	 * down, or on their way): when live editing stops with some, the page view keeps them as the autosave's draft.
	 */
	unsentEdits: boolean;
	/** The document the editor binds to; replaced (and `generation` moved) when the platform's lineage changes. */
	doc: Y.Doc;
	awareness: Awareness;
	generation: number;
	peers: DocsLivePeer[];
	revision: number | null;
	lineage: string | null;
}

/** Where the frames of a subscription go. */
export interface DocsLiveSink {
	next(frame: DocsLiveFrame): void;
	error(error: unknown): void;
	complete(): void;
}

/** The platform as the binding reaches it: the subscription and the two routes (see `transport.ts`). */
export interface DocsLiveTransport {
	/** Opens `Subscription.documentLive`; the returned function stops it. */
	open(documentId: string, connectionId: string, sink: DocsLiveSink): () => void;
	sendUpdate(documentId: string, connectionId: string, update: string): Promise<unknown>;
	sendAwareness(documentId: string, connectionId: string, awareness: string): Promise<unknown>;
	/** `GET /plugins/docs/live/status`; rejects with a 404 when the platform serves no live sessions. */
	status(): Promise<DocsLiveStatus>;
	/** Called once the binding is done with the transport. */
	dispose?(): void;
}

/** A page's live document kept in the tab, with the lineage of the platform's state it holds. */
export interface DocsLiveRemembered {
	doc: Y.Doc;
	lineage: string;
	/**
	 * It holds edits the platform never confirmed (the page was left before they were, or live editing stopped before
	 * the page view took them as its draft): the tab warns on close, and the memory never evicts it.
	 */
	unsent?: boolean;
	/** The binding that last wrote the entry: only it clears `unsent` (a binding that came back since owns it). */
	owner?: unknown;
}

export interface DocsLiveMemory {
	get(key: string): DocsLiveRemembered | undefined;
	set(key: string, entry: DocsLiveRemembered): void;
	delete(key: string): void;
	clear(): void;
	/** Whether any remembered document holds edits the platform never confirmed. */
	hasUnsent(): boolean;
	/** The keys of the remembered documents holding edits the platform never confirmed (the recency order is kept). */
	unsentKeys(): string[];
}

/** What the binding reads of a refusal: its HTTP status and the platform's code. */
interface DocsLiveErrorInfo {
	status: number | null;
	code: string | null;
	reason?: string | null;
}

interface DocsLiveBindingOptions {
	documentId: string;
	/** This tab's connection (see `newConnectionId`). */
	connectionId: string;
	user: DocsLiveUser;
	transport: DocsLiveTransport;
	/** Where the page's document is kept between visits; `key` names it (the account and the page). */
	memory?: DocsLiveMemory;
	memoryKey?: string;
	/** Reads a refusal of the transport (defaults to the app's `ApiErrorService` fields). */
	errorInfo?: (error: unknown) => DocsLiveErrorInfo;
	batchMs?: number;
	awarenessMs?: number;
	syncTimeoutMs?: number;
	backoff?: { minMs: number; maxMs: number };
	setTimeout?: (fn: () => void, ms: number) => unknown;
	clearTimeout?: (handle: unknown) => void;
	random?: () => number;
}

/** The fields `ApiErrorService` carries (status, the platform's `code`, details with the read-only reason). */
function defaultErrorInfo(error: unknown): DocsLiveErrorInfo {
	const value = (error ?? {}) as {
		statusCode?: unknown;
		status?: unknown;
		errorCode?: unknown;
		code?: unknown;
		details?: { reason?: unknown };
	};
	const status = [value.statusCode, value.status].find((candidate) => typeof candidate === 'number') as
		| number
		| undefined;
	const code = [value.errorCode, value.code].find((candidate) => typeof candidate === 'string') as string | undefined;
	const reason = typeof value.details?.reason === 'string' ? value.details.reason : null;
	return { status: status ?? null, code: code ?? null, reason };
}

/**
 * Whether what the platform lacks (`Y.encodeStateAsUpdate(doc, stateVector)`) carries anything. Its delete set always
 * travels whole, deletions the platform has included: it counts only where it differs from the platform's own.
 *
 * @param missing The update the platform lacks.
 * @param platformState The platform's state as the `sync` frame gave it.
 */
function carriesChanges(missing: Uint8Array, platformState: Uint8Array): boolean {
	const { structs, ds } = Y.decodeUpdate(missing);
	if (structs.length > 0) return true;
	if (ds.clients.size === 0) return false;
	return !Y.equalDeleteSets(ds, Y.decodeUpdate(platformState).ds);
}

/**
 * A small LRU of pages' live documents. A document holding edits the platform never confirmed (`unsent`) is the only
 * copy of them: it is kept outside the limit, and goes only when its edits are settled (sent, or taken as the
 * autosave's draft) or the tab signs out.
 */
export function createDocsLiveMemory(limit = DOCS_LIVE_REMEMBERED_PAGES): DocsLiveMemory {
	const entries = new Map<string, DocsLiveRemembered>();
	return {
		get(key) {
			const entry = entries.get(key);
			if (entry) {
				entries.delete(key);
				entries.set(key, entry);
			}
			return entry;
		},
		set(key, entry) {
			entries.delete(key);
			entries.set(key, entry);
			let settled = 0;
			for (const value of entries.values()) if (!value.unsent) settled += 1;
			// The least recently used first; a document with unsent edits is skipped (deleting while iterating is safe).
			for (const [oldest, value] of entries) {
				if (settled <= limit) break;
				if (value.unsent) continue;
				entries.delete(oldest);
				settled -= 1;
			}
		},
		delete(key) {
			entries.delete(key);
		},
		clear() {
			entries.clear();
		},
		hasUnsent() {
			for (const entry of entries.values()) if (entry.unsent) return true;
			return false;
		},
		unsentKeys() {
			const keys: string[] = [];
			for (const [key, entry] of entries) if (entry.unsent) keys.push(key);
			return keys;
		}
	};
}

const CARET_COLORS = [
	'#2563eb',
	'#db2777',
	'#16a34a',
	'#d97706',
	'#7c3aed',
	'#0891b2',
	'#dc2626',
	'#4f46e5',
	'#0d9488',
	'#c026d3'
];

/** One color per person, the same in every tab. */
export function colorForUser(id: string): string {
	let hash = 0;
	for (const char of id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
	return CARET_COLORS[hash % CARET_COLORS.length];
}

function errorsText(error: unknown): string {
	try {
		return JSON.stringify(error) ?? String(error);
	} catch {
		return String(error);
	}
}

type Listener = () => void;

/**
 * One tab's live session of one page: the empty document the editor binds to, the platform's state applied to it,
 * local edits batched and sent, cursors and presence both ways, and the ways a session ends.
 *
 * The rules that keep the shared document whole:
 * - the document starts empty and receives the platform's state (`sync`); it is never seeded from the stored JSON;
 * - a document remembered with another lineage than the platform's is dropped before the state is applied;
 * - after every `sync`, what the platform lacks (`Y.encodeStateAsUpdate(doc, stateVector)`) is sent: edits made
 *   while the session was down (or sent and lost) merge that way, so any doubt about a sent edit reopens the session;
 * - local edits are sent together, `batchMs` after the first of a batch, one request at a time;
 * - an editor bound to the document must never meet content its schema lacks (its binding would delete it for
 *   everyone): `bindEditor` checks the document, and every update after it is checked before it is applied.
 */
export class DocsLiveBinding {
	private readonly memory: DocsLiveMemory | null;
	private readonly memoryKey: string;
	private readonly errorInfo: (error: unknown) => DocsLiveErrorInfo;
	private readonly batchMs: number;
	private readonly awarenessMs: number;
	private readonly syncTimeoutMs: number;
	private readonly backoff: { minMs: number; maxMs: number };
	private readonly setTimer: (fn: () => void, ms: number) => unknown;
	private readonly clearTimer: (handle: unknown) => void;
	private readonly random: () => number;
	private readonly listeners = new Set<Listener>();
	/** Who this tab is to its co-editors (`updateUser` follows a changed name or picture). */
	private user: DocsLiveUser;

	private doc!: Y.Doc;
	private awareness!: Awareness;
	private lineage: string | null = null;
	private generation = 0;
	private snapshot!: DocsLiveSnapshot;

	private state: DocsLiveState = 'connecting';
	/** The current subscription delivered its `sync`: edits and cursors go to it. */
	private inSession = false;
	private everSynced = false;
	private readOnly = false;
	private readOnlyReason: string | null = null;
	private fallbackReason: DocsLiveFallbackReason | null = null;
	private unsupportedTypes: string[] = [];
	private revision: number | null = null;
	private peers: DocsLivePeer[] = [];
	private guard: DocsLiveSchemaTypes | null = null;

	private started = false;
	private destroyed = false;
	/** Each subscription opened has the next number; frames of an earlier one are not this session's. */
	private sessionSeq = 0;
	private stopSubscription: (() => void) | null = null;
	private attempts = 0;
	private reopenTimer: unknown = null;
	private syncTimer: unknown = null;

	private pending: Uint8Array[] = [];
	private batchTimer: unknown = null;
	private sending: Promise<void> | null = null;
	/** The local edits the request on its way covers (see `send`). */
	private sendingCovers = 0;
	/** Edits the platform refused while read-only: sent (through a new session) once it is writable again. */
	private heldWhileReadOnly = false;
	/** Moves with every `mode` frame: a refusal of an edit sent before the latest one is not taken as the mode. */
	private modeVersion = 0;
	/** Edits the platform refused as invalid in a row (see `onSendRefused`). */
	private invalidRefusals = 0;
	/** Local edits made, and the count of them the platform confirmed: more made than confirmed is unsent work. */
	private localEdits = 0;
	private confirmedEdits = 0;
	/** Waiting for the platform to confirm the local edits made up to `covers` (see `whenConfirmed`). */
	private readonly confirmWaiters = new Set<{ covers: number; settle: (confirmed: boolean) => void }>();
	private awarenessTimer: unknown = null;

	private readonly onDocUpdate = (update: Uint8Array, origin: unknown) => {
		if (origin === DOCS_LIVE_REMOTE || this.destroyed || this.state === 'fallback') return;
		this.localEdits += 1;
		this.queueLocal(update);
	};

	private readonly onAwarenessUpdate = (
		changes: { added: number[]; updated: number[]; removed: number[] },
		origin: unknown
	) => {
		if (origin === DOCS_LIVE_REMOTE || this.destroyed) return;
		const mine = this.doc.clientID;
		if ([...changes.added, ...changes.updated, ...changes.removed].includes(mine)) this.scheduleAwareness();
	};

	private readonly onAwarenessChange = () => {
		const peers = this.readPeers();
		const same =
			peers.length === this.peers.length &&
			peers.every(
				(peer, at) =>
					peer.id === this.peers[at].id &&
					peer.name === this.peers[at].name &&
					peer.imageUrl === this.peers[at].imageUrl
			);
		if (same) return;
		this.peers = peers;
		this.emit();
	};

	constructor(private readonly options: DocsLiveBindingOptions) {
		this.memory = options.memory ?? null;
		this.memoryKey = options.memoryKey ?? options.documentId;
		this.errorInfo = options.errorInfo ?? defaultErrorInfo;
		this.batchMs = options.batchMs ?? DOCS_LIVE_BATCH_MS;
		this.awarenessMs = options.awarenessMs ?? DOCS_LIVE_AWARENESS_MS;
		this.syncTimeoutMs = options.syncTimeoutMs ?? DOCS_LIVE_SYNC_TIMEOUT_MS;
		this.backoff = options.backoff ?? { minMs: DOCS_LIVE_BACKOFF_MIN_MS, maxMs: DOCS_LIVE_BACKOFF_MAX_MS };
		this.setTimer = options.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
		this.clearTimer = options.clearTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
		this.random = options.random ?? Math.random;
		this.user = options.user;

		const remembered = this.memory?.get(this.memoryKey);
		this.attachDoc(remembered?.doc ?? new Y.Doc(), remembered?.lineage ?? null);
		// A document left with edits the platform never confirmed: they are this view's unsent work until its sync settles
		// them (sent, or kept as the autosave's draft should the platform answer with another lineage).
		if (remembered?.unsent) this.localEdits = 1;
		this.snapshot = this.buildSnapshot();
	}

	getSnapshot = (): DocsLiveSnapshot => this.snapshot;

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	/** Asks the platform whether it serves live sessions, then opens this tab's. */
	start(): void {
		if (this.started || this.destroyed) return;
		this.started = true;
		this.syncTimer = this.setTimer(() => {
			this.syncTimer = null;
			if (!this.everSynced) this.fallback('timeout');
		}, this.syncTimeoutMs);
		this.options.transport.status().then(
			(status) => {
				if (this.destroyed || this.state === 'fallback') return;
				if (status && status.enabled === false) this.fallback('unavailable');
				else this.openSession();
			},
			(error: unknown) => {
				if (this.destroyed || this.state === 'fallback') return;
				// 404: the platform serves no live sessions. Anything else says nothing about them: the subscription decides.
				if (this.errorInfo(error).status === 404) this.fallback('unavailable');
				else this.openSession();
			}
		);
	}

	/**
	 * An editor of these schema types is about to be bound to the document: checks what the document holds and, when
	 * it can carry all of it, checks every update from now on before it is applied (an update it could not carry ends
	 * live editing instead). Safe to call more than once (a render that runs again); it changes nothing the view reads.
	 *
	 * @returns The types the editor does not know: the editor must not be bound then (see `refuseEditor`).
	 */
	bindEditor(types: DocsLiveSchemaTypes): string[] {
		const unknown = unknownTypesInFragment(this.doc.getXmlFragment(DOCS_LIVE_FIELD), types);
		if (unknown.length) return unknown;
		this.guard = types;
		return [];
	}

	/** A changed name or picture: co-editors see it with the next presence this tab sends. */
	updateUser(user: DocsLiveUser): void {
		const { name, color, imageUrl } = this.user;
		if (
			user.id !== this.user.id ||
			(user.name === name && user.color === color && (user.imageUrl ?? null) === (imageUrl ?? null))
		)
			return;
		this.user = user;
		this.awareness.setLocalStateField('user', {
			id: user.id,
			name: user.name,
			color: user.color,
			imageUrl: user.imageUrl ?? null
		});
	}

	/** Whether edits made here wait for the platform's confirmation now (read at the moment, not from the snapshot). */
	hasUnconfirmedEdits(): boolean {
		return this.state !== 'fallback' && this.localEdits > this.confirmedEdits;
	}

	/**
	 * Waits for the platform to confirm every edit made here so far: `true` once it holds them (a block's new anchor,
	 * which a comment or a copied link then names), `false` when it will not in time — live editing stopped, the view
	 * left, the platform refused them as read-only, or `timeoutMs` passed first (a session still down).
	 */
	whenConfirmed(timeoutMs = DOCS_LIVE_CONFIRM_TIMEOUT_MS): Promise<boolean> {
		if (this.destroyed || this.state === 'fallback') return Promise.resolve(false);
		const covers = this.localEdits;
		if (this.confirmedEdits >= covers) return Promise.resolve(true);
		// Edits the platform already refused as read-only wait for a mode change nothing here can bring about.
		if (this.readOnly && this.heldWhileReadOnly) return Promise.resolve(false);
		return new Promise<boolean>((resolve) => {
			let timer: unknown = null;
			const waiter = {
				covers,
				settle: (confirmed: boolean) => {
					if (!this.confirmWaiters.delete(waiter)) return;
					if (timer !== null) this.clearTimer(timer);
					resolve(confirmed);
				}
			};
			this.confirmWaiters.add(waiter);
			timer = this.setTimer(() => waiter.settle(false), timeoutMs);
		});
	}

	/**
	 * The page view holds the edits live editing stopped with as the autosave's draft (see `fallback`): the document
	 * kept for them in the tab's memory goes. A binding of the page opened since owns its entry, and keeps it.
	 */
	draftAdopted(): void {
		if (this.state !== 'fallback') return;
		const entry = this.memory?.get(this.memoryKey);
		if (entry && entry.doc === this.doc && entry.owner === this) this.memory?.delete(this.memoryKey);
	}

	/** The document holds content the editor does not know (see `bindEditor`): live editing stops (`unsupported`). */
	refuseEditor(unknownTypes: string[]): void {
		this.fallback('unsupported', unknownTypes);
	}

	/** Leaves the page: sends what is still waiting, then closes the session. The document stays in the tab's memory. */
	destroy(): void {
		if (this.destroyed) return;
		const inSession = this.state !== 'fallback' && this.inSession;
		// What is still waiting, after the request already on its way.
		const last = inSession ? this.mergedPending() : null;
		this.pending = [];
		this.destroyed = true;
		this.clearTimers();
		this.settleConfirmWaiters();
		this.listeners.clear();
		const stop = this.stopSubscription;
		this.stopSubscription = null;
		const { transport, documentId, connectionId } = this.options;
		// The kept document says whether it holds edits the platform never confirmed (the tab warns on close then). When
		// the request on its way and the last batch both land, and nothing else waited (no edit held while read-only or
		// typed while the session was down), it holds none.
		const lineage = this.lineage;
		const doc = this.doc;
		const remember = (unsent: boolean) => {
			const entry = this.memory?.get(this.memoryKey);
			// Only while the entry is this binding's: a binding of the page opened since owns it (and its marker).
			if (lineage === null || !entry || entry.doc !== doc || entry.owner !== this) return;
			this.memory?.set(this.memoryKey, { doc, lineage, unsent, owner: this });
		};
		const unconfirmed = this.state !== 'fallback' && this.localEdits > this.confirmedEdits;
		if (unconfirmed) remember(true);
		const allGoing = inSession && !this.heldWhileReadOnly;
		const coversAll = this.localEdits;
		const inFlightCovers = this.sending ? this.sendingCovers : this.confirmedEdits;
		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			stop?.();
			transport.dispose?.();
		};
		// The last edits go before the session closes: a session that left first would refuse them. What does not make
		// it stays in the remembered document, and the next visit's `sync` sends it.
		const before = this.sending ?? Promise.resolve();
		if (last || this.sending) {
			void before
				.then(() => (last ? transport.sendUpdate(documentId, connectionId, toBase64(last)) : undefined))
				.then(() => {
					if (!unconfirmed || !allGoing || this.confirmedEdits < inFlightCovers) return;
					this.confirmedEdits = Math.max(this.confirmedEdits, coversAll);
					remember(false);
				})
				.catch(() => undefined)
				.finally(finish);
			this.setTimer(finish, 2_000);
		} else {
			finish();
		}
		this.doc.off('update', this.onDocUpdate);
		this.awareness.off('update', this.onAwarenessUpdate);
		this.awareness.off('change', this.onAwarenessChange);
		this.awareness.destroy();
	}

	// ------------------------------------------------------------------------------------------ the session

	private openSession(): void {
		if (this.destroyed || this.state === 'fallback') return;
		this.stopSubscription?.();
		this.stopSubscription = null;
		const seq = ++this.sessionSeq;
		const current = () => seq === this.sessionSeq && !this.destroyed && this.state !== 'fallback';
		try {
			this.stopSubscription = this.options.transport.open(this.options.documentId, this.options.connectionId, {
				next: (frame) => {
					if (current()) this.onFrame(frame);
				},
				error: (error) => {
					if (current()) this.onSubscriptionError(error);
				},
				complete: () => {
					if (current()) this.onSubscriptionEnded();
				}
			});
		} catch {
			this.onSubscriptionEnded();
		}
	}

	/** The session will be opened again (a drop, a lost edit): what the platform lacks then goes after its `sync`. */
	private reopenSoon(immediately = false): void {
		if (this.destroyed || this.state === 'fallback') return;
		this.inSession = false;
		this.cancelBatch();
		this.pending = [];
		if (this.everSynced && this.state !== 'reconnecting') {
			this.state = 'reconnecting';
			this.forgetPeers();
			this.emit();
		}
		if (this.reopenTimer !== null) return;
		const delay = immediately ? 0 : this.backoffDelay();
		this.attempts += 1;
		this.reopenTimer = this.setTimer(() => {
			this.reopenTimer = null;
			this.openSession();
		}, delay);
	}

	private backoffDelay(): number {
		const exponential = Math.min(this.backoff.maxMs, this.backoff.minMs * 2 ** this.attempts);
		return Math.round(exponential / 2 + (this.random() * exponential) / 2);
	}

	private onSubscriptionError(error: unknown): void {
		// The platform refused the session (no such page, not a page, the user's session limit, the field absent).
		this.fallback(errorsText(error).includes(DOCS_LIVE_USER_LIMIT) ? 'user_limit' : 'unavailable');
	}

	private onSubscriptionEnded(): void {
		// The socket dropped, or the platform ended the stream without a `closed` frame: open it again.
		this.stopSubscription = null;
		this.reopenSoon();
	}

	private onFrame(frame: DocsLiveFrame): void {
		switch (frame.kind) {
			case 'sync':
				this.onSync(frame);
				return;
			case 'update': {
				if (!this.inSession) return;
				const update = fromBase64(frame.update);
				if (update) this.applyRemote(update);
				return;
			}
			case 'awareness': {
				if (!this.inSession) return;
				const awareness = fromBase64(frame.awareness);
				if (awareness) this.applyRemoteAwareness(awareness);
				return;
			}
			case 'mode':
				this.setMode(Boolean(frame.readOnly), frame.reason ?? null);
				return;
			case 'closed':
				this.fallback(frame.reason || 'closed');
				return;
			default:
				return;
		}
	}

	private onSync(frame: DocsLiveFrame): void {
		const update = fromBase64(frame.update);
		const stateVector = fromBase64(frame.stateVector);
		if (!update) {
			this.fallback('unavailable');
			return;
		}
		const lineage = frame.lineage ?? null;
		// Another lineage would not merge with the one held here: its content would show twice. Drop it first; but not
		// with edits the platform never confirmed: live editing stops then, and the page view keeps them as the autosave's
		// draft (merging them into the other lineage would duplicate the page).
		if (this.lineage !== null && lineage !== this.lineage) {
			if (this.localEdits > this.confirmedEdits) {
				this.fallback('lineage_changed');
				return;
			}
			this.replaceDoc();
		}
		if (this.guard) {
			const unknown = unknownTypesInUpdate(update, this.guard);
			if (unknown.length) {
				this.fallback('unsupported', unknown);
				return;
			}
		}
		Y.applyUpdate(this.doc, update, DOCS_LIVE_REMOTE);
		// The co-editors of an earlier session may be gone: the platform's view replaces them.
		this.forgetPeers();
		const awareness = fromBase64(frame.awareness);
		if (awareness) applyAwarenessUpdate(this.awareness, awareness, DOCS_LIVE_REMOTE);

		this.enterSession(frame, lineage);
		this.sendMissing(stateVector, update);
		this.clearRememberedUnsent();
		this.peers = this.readPeers();
		this.emit();
		this.sendAwarenessNow();
	}

	/** The `sync` frame applied: this session is the one edits and cursors go to. */
	private enterSession(frame: DocsLiveFrame, lineage: string | null): void {
		this.lineage = lineage;
		// Edits not confirmed yet (restored from an earlier visit, typed while the session was down) keep the document
		// marked unsent until the platform confirms them (`clearRememberedUnsent`): never evicted, warned about on close.
		const unsent = this.localEdits > this.confirmedEdits;
		if (lineage !== null) this.memory?.set(this.memoryKey, { doc: this.doc, lineage, unsent, owner: this });
		if (typeof frame.revision === 'number') this.revision = frame.revision;
		this.readOnly = Boolean(frame.readOnly);
		this.readOnlyReason = this.readOnly ? (frame.reason ?? null) : null;
		this.inSession = true;
		this.everSynced = true;
		this.attempts = 0;
		this.state = 'live';
		if (this.syncTimer !== null) {
			this.clearTimer(this.syncTimer);
			this.syncTimer = null;
		}
		this.cancelBatch();
		this.pending = [];
		// A request of an earlier session still on its way no longer holds this session's queue: its edit is in what
		// this `sync` says the platform lacks, or the platform has it.
		this.sending = null;
	}

	/** What the platform lacks after a `sync`: edits made while the session was down, or sent and lost. */
	private sendMissing(stateVector: Uint8Array | null, platformState: Uint8Array): void {
		const missing = stateVector ? Y.encodeStateAsUpdate(this.doc, stateVector) : Y.encodeStateAsUpdate(this.doc);
		if (!carriesChanges(missing, platformState)) {
			// The platform holds everything made here.
			this.confirmedEdits = this.localEdits;
			return;
		}
		// Edits of an earlier visit (a remembered document) count as this tab's unsent work until confirmed.
		if (this.localEdits === this.confirmedEdits) this.localEdits += 1;
		if (this.readOnly) {
			this.heldWhileReadOnly = true;
			return;
		}
		this.heldWhileReadOnly = false;
		this.send(missing);
	}

	private applyRemote(update: Uint8Array): void {
		if (this.guard) {
			const unknown = unknownTypesInUpdate(update, this.guard);
			if (unknown.length) {
				this.fallback('unsupported', unknown);
				return;
			}
		}
		Y.applyUpdate(this.doc, update, DOCS_LIVE_REMOTE);
	}

	private applyRemoteAwareness(update: Uint8Array): void {
		try {
			applyAwarenessUpdate(this.awareness, update, DOCS_LIVE_REMOTE);
		} catch {
			// A cursor that cannot be read is skipped; the next one replaces it.
		}
	}

	private setMode(readOnly: boolean, reason: string | null): void {
		this.modeVersion += 1;
		const wasReadOnly = this.readOnly;
		this.readOnly = readOnly;
		this.readOnlyReason = readOnly ? reason : null;
		this.emit();
		// Writable again with edits the platform refused meanwhile: a new session sends what it lacks.
		if (wasReadOnly && !readOnly && this.heldWhileReadOnly) {
			this.heldWhileReadOnly = false;
			this.reopenSoon(true);
		}
	}

	/** Live editing stops for good on this page view: the page is read again and the autosave takes over. */
	private fallback(reason: DocsLiveFallbackReason, unsupportedTypes: string[] = []): void {
		if (this.state === 'fallback' || this.destroyed) return;
		this.state = 'fallback';
		this.fallbackReason = reason;
		this.unsupportedTypes = unsupportedTypes;
		this.inSession = false;
		this.clearTimers();
		this.pending = [];
		const stop = this.stopSubscription;
		this.stopSubscription = null;
		stop?.();
		// The page is read again from the platform; edits it never confirmed are the snapshot's `unsentEdits`, which the
		// page view takes as the autosave's draft. Until it says it holds them (`draftAdopted`), their document stays in
		// the tab's memory, marked unsent: a view left before (during the reread, the editor's code loading) or a page
		// that cannot be edited now (locked, in the trash) leaves them to the next visit, and the tab warns on close.
		// Without such edits the document is forgotten: another lineage may follow.
		if (this.localEdits > this.confirmedEdits && this.lineage !== null) {
			this.memory?.set(this.memoryKey, { doc: this.doc, lineage: this.lineage, unsent: true, owner: this });
		} else {
			this.memory?.delete(this.memoryKey);
		}
		this.forgetPeers();
		this.emit();
	}

	// ------------------------------------------------------------------------------------------ local edits

	private queueLocal(update: Uint8Array): void {
		// Not in a session: the next `sync` sends what the platform lacks, this edit with it.
		if (!this.inSession) return;
		if (this.readOnly) {
			this.heldWhileReadOnly = true;
			return;
		}
		this.pending.push(update);
		if (this.batchTimer === null && !this.sending) {
			this.batchTimer = this.setTimer(() => {
				this.batchTimer = null;
				this.flush();
			}, this.batchMs);
		}
	}

	private flush(): void {
		this.cancelBatch();
		if (!this.pending.length || this.sending) return;
		const update = this.mergedPending();
		this.pending = [];
		if (update) this.send(update);
	}

	/** The edits waiting to be sent, as one update; `null` when none wait. */
	private mergedPending(): Uint8Array | null {
		if (!this.pending.length) return null;
		return this.pending.length === 1 ? this.pending[0] : Y.mergeUpdates(this.pending);
	}

	private send(update: Uint8Array): void {
		const seq = this.sessionSeq;
		// Every local edit made so far is in this update or in one sent before it.
		const covers = this.localEdits;
		const modeAt = this.modeVersion;
		this.sendingCovers = covers;
		const request = this.options.transport.sendUpdate(
			this.options.documentId,
			this.options.connectionId,
			toBase64(update)
		);
		const sending: Promise<void> = request.then(
			() => {
				if (this.sending === sending) this.sending = null;
				this.confirmedEdits = Math.max(this.confirmedEdits, covers);
				this.invalidRefusals = 0;
				this.settleConfirmWaiters();
				this.clearRememberedUnsent();
				if (this.destroyed || this.state === 'fallback' || !this.inSession) return;
				// Typed while this one went: the next batch goes now (it waited for this one).
				if (this.pending.length && this.batchTimer === null && !this.sending) {
					this.batchTimer = this.setTimer(() => {
						this.batchTimer = null;
						this.flush();
					}, this.batchMs);
				}
			},
			(error: unknown) => {
				if (this.sending === sending) this.sending = null;
				if (this.destroyed || this.state === 'fallback') return;
				this.onSendRefused(error, seq, modeAt);
			}
		);
		this.sending = sending;
	}

	private onSendRefused(error: unknown, seq: number, modeAt: number): void {
		// The answer to a request of an earlier session says nothing about this one (which may be writable): the edit it
		// carried went with this session's `sync` (what the platform lacked then).
		if (seq !== this.sessionSeq) return;
		const info = this.errorInfo(error);
		const refusedAsReadOnly =
			info.code === DOCS_LIVE_READ_ONLY ||
			info.code === DOCS_LIVE_TOO_LARGE ||
			info.status === 403 ||
			info.status === 413;
		// Refused under a mode the platform has changed since (it said writable after the edit went): the refusal is
		// not the mode now. A new session sends the edit with what the platform lacks.
		if (refusedAsReadOnly && modeAt !== this.modeVersion && !this.readOnly) {
			this.reopenSoon(true);
			return;
		}
		if (info.code === DOCS_LIVE_READ_ONLY || (info.status === 403 && !info.code)) {
			this.heldWhileReadOnly = true;
			this.readOnly = true;
			this.readOnlyReason = info.reason ?? this.readOnlyReason ?? DOCS_LIVE_REASONS.NO_WRITE_ACCESS;
			this.pending = [];
			this.cancelBatch();
			this.emit();
			return;
		}
		if (info.code === DOCS_LIVE_TOO_LARGE || info.status === 413) {
			this.heldWhileReadOnly = true;
			this.readOnly = true;
			this.readOnlyReason = DOCS_LIVE_REASONS.SIZE_LIMIT;
			this.pending = [];
			this.cancelBatch();
			this.emit();
			return;
		}
		if (info.code === DOCS_LIVE_UPDATE_INVALID || info.status === 400) {
			// A block the page's schema does not accept: the platform applied nothing of the edit. A new session settles
			// what it holds; refused again (the same edit goes with what the platform lacks), live editing stops, and the
			// page view keeps the text as the autosave's draft rather than sending it forever.
			this.invalidRefusals += 1;
			if (this.invalidRefusals > 1) this.fallback('update_invalid');
			else this.reopenSoon(true);
			return;
		}
		if (info.code === DOCS_LIVE_SESSION_NOT_FOUND) {
			// The platform no longer holds this tab's session (a restart, another process): open it again.
			this.reopenSoon(true);
			return;
		}
		if (info.status === 404) {
			// A 404 without the session's code: the live routes are gone. The status route decides.
			this.options.transport.status().then(
				() => this.reopenSoon(true),
				(statusError: unknown) => {
					if (this.errorInfo(statusError).status === 404) this.fallback('unavailable');
					else this.reopenSoon();
				}
			);
			this.inSession = false;
			return;
		}
		// The edit may or may not have landed (a network error, a busy platform): a new session settles it.
		this.reopenSoon();
	}

	// ------------------------------------------------------------------------------------------ cursors and presence

	private scheduleAwareness(): void {
		if (!this.inSession || this.awarenessTimer !== null) return;
		this.awarenessTimer = this.setTimer(() => {
			this.awarenessTimer = null;
			this.sendAwarenessNow();
		}, this.awarenessMs);
	}

	private sendAwarenessNow(): void {
		if (!this.inSession || this.destroyed) return;
		const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
		this.options.transport
			.sendAwareness(this.options.documentId, this.options.connectionId, toBase64(update))
			.catch((error: unknown) => {
				if (this.destroyed || this.state === 'fallback') return;
				// A lost cursor is replaced by the next one; a lost session is opened again.
				if (this.errorInfo(error).code === DOCS_LIVE_SESSION_NOT_FOUND) this.reopenSoon(true);
			});
	}

	private readPeers(): DocsLivePeer[] {
		const peers: DocsLivePeer[] = [];
		const seen = new Set<string>([this.user.id]);
		const states = Array.from(this.awareness.getStates().entries()).sort(([a], [b]) => a - b);
		for (const [clientId, state] of states) {
			if (clientId === this.doc.clientID) continue;
			const user = (state as { user?: Partial<DocsLiveUser> } | null)?.user;
			const id = typeof user?.id === 'string' ? user.id : null;
			if (!id || seen.has(id)) continue;
			seen.add(id);
			peers.push({
				id,
				name: typeof user?.name === 'string' ? user.name : '',
				color: typeof user?.color === 'string' ? user.color : colorForUser(id),
				imageUrl: typeof user?.imageUrl === 'string' ? user.imageUrl : null
			});
		}
		return peers;
	}

	private forgetPeers(): void {
		const others = Array.from(this.awareness.getStates().keys()).filter(
			(clientId) => clientId !== this.doc.clientID
		);
		if (others.length) removeAwarenessStates(this.awareness, others, DOCS_LIVE_REMOTE);
		// Their clocks go too: the next snapshot may hold the same states at the same clocks, which an awareness that kept
		// the clocks would take as already applied, leaving the co-editors out until they move.
		for (const clientId of others) this.awareness.meta.delete(clientId);
		this.peers = [];
	}

	// ------------------------------------------------------------------------------------------ the document

	private attachDoc(doc: Y.Doc, lineage: string | null): void {
		this.doc = doc;
		this.lineage = lineage;
		this.awareness = new Awareness(doc);
		const { id, name, color, imageUrl } = this.user;
		this.awareness.setLocalStateField('user', { id, name, color, imageUrl: imageUrl ?? null });
		doc.on('update', this.onDocUpdate);
		this.awareness.on('update', this.onAwarenessUpdate);
		this.awareness.on('change', this.onAwarenessChange);
	}

	private replaceDoc(): void {
		this.doc.off('update', this.onDocUpdate);
		this.awareness.off('update', this.onAwarenessUpdate);
		this.awareness.off('change', this.onAwarenessChange);
		this.awareness.destroy();
		this.memory?.delete(this.memoryKey);
		this.attachDoc(new Y.Doc(), null);
		this.generation += 1;
		// An editor bound to the dropped document is bound again, and checked again, by whoever binds it.
		this.guard = null;
		this.pending = [];
		this.cancelBatch();
		this.heldWhileReadOnly = false;
	}

	// ------------------------------------------------------------------------------------------ plumbing

	private cancelBatch(): void {
		if (this.batchTimer !== null) {
			this.clearTimer(this.batchTimer);
			this.batchTimer = null;
		}
	}

	private clearTimers(): void {
		this.cancelBatch();
		for (const name of ['reopenTimer', 'syncTimer', 'awarenessTimer'] as const) {
			const handle = this[name];
			if (handle !== null) {
				this.clearTimer(handle);
				this[name] = null;
			}
		}
	}

	private buildSnapshot(): DocsLiveSnapshot {
		return {
			state: this.state,
			synced: this.everSynced,
			readOnly: this.readOnly,
			readOnlyReason: this.readOnlyReason,
			fallbackReason: this.fallbackReason,
			unsupportedTypes: this.unsupportedTypes,
			unsentEdits: this.localEdits > this.confirmedEdits,
			doc: this.doc,
			awareness: this.awareness,
			generation: this.generation,
			peers: this.peers,
			revision: this.revision,
			lineage: this.lineage
		};
	}

	/**
	 * Every edit made here is confirmed: the remembered document's unsent mark goes. Only while the entry is this
	 * binding's; a view that left or stopped live editing keeps its own marker (see `destroy` and `fallback`).
	 */
	private clearRememberedUnsent(): void {
		if (this.destroyed || this.state === 'fallback' || this.localEdits > this.confirmedEdits) return;
		const entry = this.memory?.get(this.memoryKey);
		if (!entry?.unsent || entry.doc !== this.doc || entry.owner !== this) return;
		this.memory?.set(this.memoryKey, { ...entry, unsent: false });
	}

	/** Answers the waits of `whenConfirmed` that the current counts settle. */
	private settleConfirmWaiters(): void {
		if (!this.confirmWaiters.size) return;
		const stopped = this.destroyed || this.state === 'fallback';
		for (const waiter of Array.from(this.confirmWaiters)) {
			if (this.confirmedEdits >= waiter.covers) waiter.settle(true);
			else if (stopped || (this.readOnly && this.heldWhileReadOnly)) waiter.settle(false);
		}
	}

	private emit(): void {
		this.snapshot = this.buildSnapshot();
		this.settleConfirmWaiters();
		for (const listener of Array.from(this.listeners)) listener();
	}
}
