import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import {
	createDocsLiveMemory,
	DocsLiveBinding,
	type DocsLiveMemory,
	type DocsLiveSink,
	type DocsLiveTransport
} from './binding';
import { fromBase64, toBase64, type DocsLiveFrame, type DocsLiveStatus } from './protocol';

const PAGE = '6d5c3f0e-0000-4000-8000-000000000001';
const CONNECTION = 'tab0123456789abcdef';
const ME = { id: 'user-me', name: 'Me', color: '#2563eb' };
const SCHEMA = { nodes: new Set(['doc', 'paragraph', 'text', 'heading']), marks: new Set(['bold', 'italic']) };

/** A paragraph appended to the shared fragment, as the editor's binding writes one. */
function addParagraph(doc: Y.Doc, text: string, name = 'paragraph'): void {
	const element = new Y.XmlElement(name);
	element.insert(0, [new Y.XmlText(text)]);
	doc.getXmlFragment('default').push([element]);
}

function textOf(doc: Y.Doc): string {
	return doc.getXmlFragment('default').toString();
}

interface Subscription {
	sink: DocsLiveSink;
	stopped: boolean;
}

/** The platform, as the binding reaches it: subscriptions it can play frames on, and the requests it received. */
class FakeTransport implements DocsLiveTransport {
	readonly subscriptions: Subscription[] = [];
	readonly updates: Uint8Array[] = [];
	readonly awareness: Uint8Array[] = [];
	statusAnswer: () => Promise<DocsLiveStatus> = () =>
		Promise.resolve({ enabled: true, shared: true, documents: 0, sessions: 0 });
	updateAnswer: () => Promise<unknown> = () => Promise.resolve({ accepted: true, relayed: false });
	disposed = false;

	open(documentId: string, connectionId: string, sink: DocsLiveSink): () => void {
		expect(documentId).toBe(PAGE);
		expect(connectionId).toBe(CONNECTION);
		const subscription: Subscription = { sink, stopped: false };
		this.subscriptions.push(subscription);
		return () => {
			subscription.stopped = true;
		};
	}

	sendUpdate(documentId: string, connectionId: string, update: string): Promise<unknown> {
		this.updates.push(fromBase64(update) as Uint8Array);
		return this.updateAnswer();
	}

	sendAwareness(documentId: string, connectionId: string, awareness: string): Promise<unknown> {
		this.awareness.push(fromBase64(awareness) as Uint8Array);
		return Promise.resolve({ accepted: true, relayed: false });
	}

	status(): Promise<DocsLiveStatus> {
		return this.statusAnswer();
	}

	dispose(): void {
		this.disposed = true;
	}

	get current(): Subscription {
		const open = this.subscriptions.filter((subscription) => !subscription.stopped);
		return open[open.length - 1];
	}

	play(frame: Partial<DocsLiveFrame> & { kind: string }, subscription = this.current): void {
		subscription.sink.next({ documentId: PAGE, ...frame });
	}
}

/** The platform's `sync` frame for its document. */
function syncFrame(server: Y.Doc, extra: Partial<DocsLiveFrame> = {}): DocsLiveFrame {
	return {
		kind: 'sync',
		documentId: PAGE,
		update: toBase64(Y.encodeStateAsUpdate(server)),
		stateVector: toBase64(Y.encodeStateVector(server)),
		awareness: null,
		readOnly: false,
		reason: null,
		revision: 3,
		lineage: `${PAGE}:3`,
		...extra
	};
}

function serverWith(...paragraphs: string[]): Y.Doc {
	const server = new Y.Doc();
	for (const text of paragraphs) addParagraph(server, text);
	return server;
}

/** What the platform holds once it applied every edit the tab sent. */
function serverAfter(server: Y.Doc, transport: FakeTransport): Y.Doc {
	for (const update of transport.updates) Y.applyUpdate(server, update);
	return server;
}

const bindings: DocsLiveBinding[] = [];

function bind(
	transport: FakeTransport,
	options: { memory?: DocsLiveMemory; syncTimeoutMs?: number } = {}
): DocsLiveBinding {
	const binding = new DocsLiveBinding({
		documentId: PAGE,
		connectionId: CONNECTION,
		user: ME,
		transport,
		memory: options.memory,
		memoryKey: `${ME.id}:${PAGE}`,
		batchMs: 75,
		syncTimeoutMs: options.syncTimeoutMs ?? 10_000,
		backoff: { minMs: 1_000, maxMs: 4_000 },
		random: () => 1
	});
	bindings.push(binding);
	binding.start();
	return binding;
}

/** Lets the status answer and the subscription open (microtasks), without moving the clock. */
async function settle(): Promise<void> {
	await jest.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	for (const binding of bindings.splice(0)) binding.destroy();
	jest.useRealTimers();
});

describe('DocsLiveBinding', () => {
	it('binds an empty document and fills it from the sync frame only, never from the stored page', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		expect(binding.getSnapshot()).toMatchObject({ state: 'connecting', synced: false });
		expect(textOf(binding.getSnapshot().doc)).toBe('');

		await settle();
		expect(transport.subscriptions).toHaveLength(1);
		transport.play(syncFrame(serverWith('Hello', 'World')));

		const snapshot = binding.getSnapshot();
		expect(snapshot).toMatchObject({
			state: 'live',
			synced: true,
			readOnly: false,
			revision: 3,
			lineage: `${PAGE}:3`
		});
		expect(textOf(snapshot.doc)).toBe('<paragraph>Hello</paragraph><paragraph>World</paragraph>');
		// Nothing typed here: nothing is sent back.
		expect(transport.updates).toHaveLength(0);
	});

	it('sends what the platform lacks after the sync, so edits made offline merge', async () => {
		const memory = createDocsLiveMemory();
		const server = serverWith('Shared');
		const kept = new Y.Doc();
		Y.applyUpdate(kept, Y.encodeStateAsUpdate(server));
		addParagraph(kept, 'Typed offline');
		memory.set(`${ME.id}:${PAGE}`, { doc: kept, lineage: `${PAGE}:3` });
		// Someone else wrote meanwhile.
		addParagraph(server, 'From a co-editor');

		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(server));

		expect(binding.getSnapshot().doc).toBe(kept);
		expect(transport.updates).toHaveLength(1);
		const merged = serverAfter(server, transport);
		expect(textOf(merged)).toContain('<paragraph>Typed offline</paragraph>');
		expect(textOf(merged)).toContain('<paragraph>From a co-editor</paragraph>');
		expect(textOf(merged)).toBe(textOf(binding.getSnapshot().doc));
	});

	it('drops a remembered document of another lineage before applying the state, so nothing shows twice', async () => {
		const memory = createDocsLiveMemory();
		const stale = serverWith('Old seed');
		memory.set(`${ME.id}:${PAGE}`, { doc: stale, lineage: `${PAGE}:1` });

		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		expect(binding.getSnapshot().doc).toBe(stale);
		await settle();
		transport.play(syncFrame(serverWith('New seed')));

		const snapshot = binding.getSnapshot();
		expect(snapshot.doc).not.toBe(stale);
		expect(snapshot.generation).toBe(1);
		expect(textOf(snapshot.doc)).toBe('<paragraph>New seed</paragraph>');
		// The old lineage's content is never offered to the platform.
		expect(transport.updates).toHaveLength(0);
		expect(memory.get(`${ME.id}:${PAGE}`)).toEqual({ doc: snapshot.doc, lineage: `${PAGE}:3` });
	});

	it('batches local edits for the batch window into one merged update, one request at a time', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		let release: () => void = () => undefined;
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		const { doc } = binding.getSnapshot();

		addParagraph(doc, 'one');
		addParagraph(doc, 'two');
		await jest.advanceTimersByTimeAsync(74);
		expect(transport.updates).toHaveLength(0);
		addParagraph(doc, 'three');
		transport.updateAnswer = () =>
			new Promise((resolve) => {
				release = () => resolve({ accepted: true, relayed: false });
			});
		await jest.advanceTimersByTimeAsync(1);
		expect(transport.updates).toHaveLength(1);

		// Typed while the request is on its way: it waits for it, then goes as the next batch.
		addParagraph(doc, 'four');
		await jest.advanceTimersByTimeAsync(500);
		expect(transport.updates).toHaveLength(1);
		transport.updateAnswer = () => Promise.resolve({ accepted: true, relayed: false });
		release();
		await jest.advanceTimersByTimeAsync(75);
		expect(transport.updates).toHaveLength(2);

		expect(textOf(serverAfter(server, transport))).toBe(textOf(doc));
	});

	it('is read-only as the platform says, sends nothing then, and sends the held edits once writable again', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server, { readOnly: true, reason: 'no_write_access' }));
		expect(binding.getSnapshot()).toMatchObject({ readOnly: true, readOnlyReason: 'no_write_access' });

		addParagraph(binding.getSnapshot().doc, 'Typed while read-only');
		await jest.advanceTimersByTimeAsync(500);
		expect(transport.updates).toHaveLength(0);

		transport.play({ kind: 'mode', readOnly: false, reason: null });
		expect(binding.getSnapshot()).toMatchObject({ readOnly: false, readOnlyReason: null });
		// A new session: its sync says what the platform lacks.
		await jest.advanceTimersByTimeAsync(0);
		expect(transport.subscriptions).toHaveLength(2);
		transport.play(syncFrame(server));
		expect(transport.updates).toHaveLength(1);
		expect(textOf(serverAfter(server, transport))).toContain('Typed while read-only');
	});

	it('turns read-only when the platform refuses an edit as read-only (403)', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		transport.updateAnswer = () =>
			Promise.reject({ statusCode: 403, errorCode: 'DOCS_LIVE_READ_ONLY', details: { reason: 'locked' } });

		addParagraph(binding.getSnapshot().doc, 'Refused');
		await jest.advanceTimersByTimeAsync(75);
		expect(binding.getSnapshot()).toMatchObject({ state: 'live', readOnly: true, readOnlyReason: 'locked' });
	});

	it('stops live editing on a closed frame: the subscription ends and the document is forgotten', async () => {
		const memory = createDocsLiveMemory();
		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		expect(memory.get(`${ME.id}:${PAGE}`)).toBeDefined();
		const subscription = transport.current;

		transport.play({ kind: 'closed', reason: 'access_revoked' });

		expect(binding.getSnapshot()).toMatchObject({
			state: 'fallback',
			fallbackReason: 'access_revoked',
			synced: true
		});
		expect(subscription.stopped).toBe(true);
		expect(memory.get(`${ME.id}:${PAGE}`)).toBeUndefined();
		// Nothing is sent from a page that left live editing.
		addParagraph(binding.getSnapshot().doc, 'After close');
		await jest.advanceTimersByTimeAsync(500);
		expect(transport.updates).toHaveLength(0);
	});

	it('falls back without opening a session when the status route answers 404', async () => {
		const transport = new FakeTransport();
		transport.statusAnswer = () => Promise.reject({ statusCode: 404 });
		const binding = bind(transport);
		await settle();
		expect(transport.subscriptions).toHaveLength(0);
		expect(binding.getSnapshot()).toMatchObject({ state: 'fallback', fallbackReason: 'unavailable' });
	});

	it('falls back when the platform refuses the session (the user limit)', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.current.sink.error([
			{
				message: 'A user holds at most 20 live sessions',
				extensions: { originalError: { code: 'DOCS_LIVE_USER_LIMIT', statusCode: 429 } }
			}
		]);
		expect(binding.getSnapshot()).toMatchObject({ state: 'fallback', fallbackReason: 'user_limit' });
	});

	it('falls back when no first state arrives in time', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport, { syncTimeoutMs: 5_000 });
		await settle();
		await jest.advanceTimersByTimeAsync(5_000);
		expect(binding.getSnapshot()).toMatchObject({ state: 'fallback', fallbackReason: 'timeout' });
		expect(transport.current).toBeUndefined();
	});

	it('opens the session again on 404 DOCS_LIVE_SESSION_NOT_FOUND, and the next sync sends the lost edit', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		transport.updateAnswer = () => Promise.reject({ statusCode: 404, errorCode: 'DOCS_LIVE_SESSION_NOT_FOUND' });

		addParagraph(binding.getSnapshot().doc, 'Lost on the way');
		await jest.advanceTimersByTimeAsync(75);
		// Opened again at once (a timer set while one runs goes a millisecond later).
		await jest.advanceTimersByTimeAsync(1);
		expect(transport.subscriptions).toHaveLength(2);
		expect(binding.getSnapshot().state).toBe('reconnecting');

		transport.updates.length = 0;
		transport.updateAnswer = () => Promise.resolve({ accepted: true, relayed: false });
		transport.play(syncFrame(server));
		expect(binding.getSnapshot().state).toBe('live');
		expect(transport.updates).toHaveLength(1);
		expect(textOf(serverAfter(server, transport))).toContain('Lost on the way');
	});

	it('reconnects after a dropped socket, keeps the editor writable meanwhile, and merges what was typed', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));

		transport.current.sink.complete();
		expect(binding.getSnapshot()).toMatchObject({ state: 'reconnecting', synced: true });
		addParagraph(binding.getSnapshot().doc, 'Typed while down');
		addParagraph(server, 'Written by someone else meanwhile');
		await jest.advanceTimersByTimeAsync(999);
		expect(transport.updates).toHaveLength(0);
		await jest.advanceTimersByTimeAsync(1);
		expect(transport.subscriptions).toHaveLength(2);

		transport.play(syncFrame(server));
		expect(binding.getSnapshot().state).toBe('live');
		const merged = serverAfter(server, transport);
		expect(textOf(merged)).toContain('Typed while down');
		expect(textOf(binding.getSnapshot().doc)).toContain('Written by someone else meanwhile');
		expect(textOf(merged)).toBe(textOf(binding.getSnapshot().doc));
	});

	it('ignores the frames of a subscription it replaced', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		const first = transport.current;
		transport.updateAnswer = () => Promise.reject({ statusCode: 404, errorCode: 'DOCS_LIVE_SESSION_NOT_FOUND' });
		addParagraph(binding.getSnapshot().doc, 'x');
		await jest.advanceTimersByTimeAsync(75);
		await jest.advanceTimersByTimeAsync(1);
		expect(transport.subscriptions).toHaveLength(2);

		// The platform ends the replaced session with `closed: replaced`: it is not this session's.
		first.sink.next({ kind: 'closed', documentId: PAGE, reason: 'replaced' });
		expect(binding.getSnapshot().state).toBe('reconnecting');
	});

	it('applies the co-editors’ edits, and stops before an edit that brings content the editor cannot carry', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		expect(binding.bindEditor(SCHEMA)).toEqual([]);

		const before = Y.encodeStateVector(server);
		addParagraph(server, 'From a co-editor');
		transport.play({ kind: 'update', update: toBase64(Y.encodeStateAsUpdate(server, before)) });
		expect(textOf(binding.getSnapshot().doc)).toContain('From a co-editor');

		const next = Y.encodeStateVector(server);
		addParagraph(server, 'A callout', 'callout');
		transport.play({ kind: 'update', update: toBase64(Y.encodeStateAsUpdate(server, next)) });
		const snapshot = binding.getSnapshot();
		expect(snapshot).toMatchObject({
			state: 'fallback',
			fallbackReason: 'unsupported',
			unsupportedTypes: ['callout']
		});
		// Never applied: the editor's binding would have deleted it for everyone.
		expect(textOf(snapshot.doc)).not.toContain('callout');
	});

	it('reports the content an editor cannot carry before it is bound', async () => {
		const server = serverWith('Start');
		addParagraph(server, 'Table', 'table');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		expect(binding.bindEditor(SCHEMA)).toEqual(['table']);
		binding.refuseEditor(['table']);
		expect(binding.getSnapshot()).toMatchObject({
			state: 'fallback',
			fallbackReason: 'unsupported',
			unsupportedTypes: ['table']
		});
	});

	it('lists the other people on the page from the awareness, once each, without this person', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		const others = new Y.Doc();
		const theirs = new Awareness(others);
		theirs.setLocalStateField('user', { id: 'user-ada', name: 'Ada', color: '#db2777' });
		const sameAccountOtherTab = new Awareness(new Y.Doc());
		sameAccountOtherTab.setLocalStateField('user', { id: ME.id, name: 'Me', color: ME.color });
		transport.play(
			syncFrame(serverWith('Start'), { awareness: toBase64(encodeAwarenessUpdate(theirs, [others.clientID])) })
		);
		transport.play({
			kind: 'awareness',
			awareness: toBase64(encodeAwarenessUpdate(sameAccountOtherTab, [sameAccountOtherTab.clientID]))
		});

		expect(binding.getSnapshot().peers).toEqual([
			{ id: 'user-ada', name: 'Ada', color: '#db2777', imageUrl: null }
		]);
		// This tab's presence went to the platform with the sync.
		expect(transport.awareness.length).toBeGreaterThan(0);
		for (const awareness of [theirs, sameAccountOtherTab]) awareness.destroy();
	});

	it('sends the waiting batch when the page is left, then closes the session', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		const subscription = transport.current;

		addParagraph(binding.getSnapshot().doc, 'Last words');
		binding.destroy();
		await jest.advanceTimersByTimeAsync(0);
		expect(transport.updates).toHaveLength(1);
		expect(textOf(serverAfter(server, transport))).toContain('Last words');
		expect(subscription.stopped).toBe(true);
		expect(transport.disposed).toBe(true);
	});
});
