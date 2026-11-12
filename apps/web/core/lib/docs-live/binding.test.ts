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

describe('createDocsLiveMemory', () => {
	it('never evicts a document holding unsent edits, however many pages are opened after it', () => {
		const memory = createDocsLiveMemory(8);
		const leftOffline = new Y.Doc();
		memory.set('left-offline', { doc: leftOffline, lineage: 'l:1', unsent: true });
		for (let index = 0; index < 8; index += 1) memory.set(`page-${index}`, { doc: new Y.Doc(), lineage: 'l:1' });

		expect(memory.hasUnsent()).toBe(true);
		expect(memory.get('left-offline')?.doc).toBe(leftOffline);
		// The limit still holds for the others: the least recently used of them goes.
		memory.set('page-8', { doc: new Y.Doc(), lineage: 'l:1' });
		expect(memory.get('page-0')).toBeUndefined();
		expect(memory.get('page-8')).toBeDefined();
		expect(memory.get('left-offline')?.unsent).toBe(true);
	});
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
		expect(memory.get(`${ME.id}:${PAGE}`)?.doc).toBe(snapshot.doc);
		expect(memory.get(`${ME.id}:${PAGE}`)?.lineage).toBe(`${PAGE}:3`);
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

	it('reports the edits the platform never confirmed when live editing stops, and none once they are confirmed', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		const { doc } = binding.getSnapshot();

		addParagraph(doc, 'Confirmed');
		await jest.advanceTimersByTimeAsync(75);
		expect(binding.getSnapshot().unsentEdits).toBe(false);

		addParagraph(doc, 'Still in the batch window');
		transport.play({ kind: 'closed', reason: 'shutdown' });
		expect(binding.getSnapshot()).toMatchObject({ state: 'fallback', unsentEdits: true });
	});

	it('does not let the answer to a request of an earlier session make the new one read-only', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		let refuse: (error: unknown) => void = () => undefined;
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		transport.updateAnswer = () =>
			new Promise((_, reject) => {
				refuse = reject;
			});
		addParagraph(binding.getSnapshot().doc, 'On its way');
		await jest.advanceTimersByTimeAsync(75);
		expect(transport.updates).toHaveLength(1);

		// The socket drops and the new session is writable.
		transport.current.sink.complete();
		await jest.advanceTimersByTimeAsync(1_000);
		transport.updateAnswer = () => Promise.resolve({ accepted: true, relayed: false });
		transport.play(syncFrame(server));
		expect(binding.getSnapshot()).toMatchObject({ state: 'live', readOnly: false });

		refuse({ statusCode: 403, errorCode: 'DOCS_LIVE_READ_ONLY' });
		await jest.advanceTimersByTimeAsync(0);
		expect(binding.getSnapshot()).toMatchObject({ state: 'live', readOnly: false });
		// The edit went again with the new session's sync (what the platform lacked then).
		expect(transport.updates).toHaveLength(2);
		const resent = new Y.Doc();
		Y.applyUpdate(resent, Y.encodeStateAsUpdate(server));
		Y.applyUpdate(resent, transport.updates[1]);
		expect(textOf(resent)).toContain('On its way');
	});

	it('sends nothing after a sync of the same document, deletions included', async () => {
		const memory = createDocsLiveMemory();
		const server = serverWith('Keep', 'Gone');
		server.getXmlFragment('default').delete(1, 1);
		const kept = new Y.Doc();
		Y.applyUpdate(kept, Y.encodeStateAsUpdate(server));
		memory.set(`${ME.id}:${PAGE}`, { doc: kept, lineage: `${PAGE}:3` });

		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(server, { readOnly: true, reason: 'locked' }));

		expect(transport.updates).toHaveLength(0);
		expect(binding.getSnapshot().unsentEdits).toBe(false);
	});

	it('sends a deletion made offline (a change of the delete set alone)', async () => {
		const memory = createDocsLiveMemory();
		const server = serverWith('Keep', 'Remove me');
		const kept = new Y.Doc();
		Y.applyUpdate(kept, Y.encodeStateAsUpdate(server));
		kept.getXmlFragment('default').delete(1, 1);
		memory.set(`${ME.id}:${PAGE}`, { doc: kept, lineage: `${PAGE}:3` });

		const transport = new FakeTransport();
		bind(transport, { memory });
		await settle();
		transport.play(syncFrame(server));

		expect(transport.updates).toHaveLength(1);
		expect(textOf(serverAfter(server, transport))).not.toContain('Remove me');
	});

	it('stops instead of dropping unconfirmed edits when the platform answers with another lineage', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		transport.current.sink.complete();
		addParagraph(binding.getSnapshot().doc, 'Typed while down');
		await jest.advanceTimersByTimeAsync(1_000);

		transport.play(syncFrame(serverWith('Reseeded'), { lineage: `${PAGE}:9`, revision: 9 }));
		const snapshot = binding.getSnapshot();
		expect(snapshot).toMatchObject({
			state: 'fallback',
			fallbackReason: 'lineage_changed',
			unsentEdits: true,
			generation: 0
		});
		expect(textOf(snapshot.doc)).toContain('Typed while down');
		expect(transport.updates).toHaveLength(0);
	});

	it('sends the next edits of a new session while a request of the earlier one is still on its way', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		transport.updateAnswer = () => new Promise(() => undefined);
		addParagraph(binding.getSnapshot().doc, 'Landed, answer lost');
		await jest.advanceTimersByTimeAsync(75);
		expect(transport.updates).toHaveLength(1);
		// The platform applied it; the answer never comes.
		Y.applyUpdate(server, transport.updates[0]);

		transport.current.sink.complete();
		await jest.advanceTimersByTimeAsync(1_000);
		transport.updateAnswer = () => Promise.resolve({ accepted: true, relayed: false });
		transport.play(syncFrame(server));
		expect(transport.updates).toHaveLength(1);

		addParagraph(binding.getSnapshot().doc, 'Next');
		await jest.advanceTimersByTimeAsync(75);
		expect(transport.updates).toHaveLength(2);
	});

	it('does not take a refusal of an edit sent before the latest mode change as the mode', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		let refuse: (error: unknown) => void = () => undefined;
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		transport.updateAnswer = () =>
			new Promise((_, reject) => {
				refuse = reject;
			});
		addParagraph(binding.getSnapshot().doc, 'Sent while it was writable');
		await jest.advanceTimersByTimeAsync(75);

		transport.play({ kind: 'mode', readOnly: true, reason: 'locked' });
		transport.play({ kind: 'mode', readOnly: false, reason: null });
		transport.updateAnswer = () => Promise.resolve({ accepted: true, relayed: false });
		refuse({ statusCode: 403, errorCode: 'DOCS_LIVE_READ_ONLY', details: { reason: 'locked' } });
		await jest.advanceTimersByTimeAsync(1);

		expect(binding.getSnapshot().readOnly).toBe(false);
		// A new session sends the refused edit with what the platform lacks.
		expect(transport.subscriptions.length).toBeGreaterThanOrEqual(2);
		transport.play(syncFrame(server));
		expect(textOf(serverAfter(server, transport))).toContain('Sent while it was writable');
	});

	it('shows a co-editor again after a reconnect whose snapshot holds the same awareness clock', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		const theirs = new Awareness(new Y.Doc());
		theirs.setLocalStateField('user', { id: 'user-ada', name: 'Ada', color: '#db2777' });
		const snapshotOfAda = toBase64(encodeAwarenessUpdate(theirs, [theirs.clientID]));
		transport.play(syncFrame(serverWith('Start'), { awareness: snapshotOfAda }));
		expect(binding.getSnapshot().peers.map((peer) => peer.id)).toEqual(['user-ada']);

		transport.current.sink.complete();
		expect(binding.getSnapshot().peers).toEqual([]);
		await jest.advanceTimersByTimeAsync(1_000);
		transport.play(syncFrame(serverWith('Start'), { awareness: snapshotOfAda }));
		expect(binding.getSnapshot().peers.map((peer) => peer.id)).toEqual(['user-ada']);
		theirs.destroy();
	});

	it('opens the session again when the platform refuses an edit as invalid, and stops when it refuses it again', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		transport.updateAnswer = () => Promise.reject({ statusCode: 400, errorCode: 'DOCS_LIVE_UPDATE_INVALID' });

		addParagraph(binding.getSnapshot().doc, 'Not for this page');
		await jest.advanceTimersByTimeAsync(75);
		await jest.advanceTimersByTimeAsync(1);
		expect(transport.subscriptions).toHaveLength(2);
		expect(binding.getSnapshot().state).toBe('reconnecting');

		// The new session's sync sends the edit again (the platform lacks it); refused again, live editing stops.
		transport.play(syncFrame(server));
		await jest.advanceTimersByTimeAsync(1);
		expect(binding.getSnapshot()).toMatchObject({
			state: 'fallback',
			fallbackReason: 'update_invalid',
			unsentEdits: true
		});
	});

	it('keeps edits remembered from an earlier visit when the platform answers with another lineage', async () => {
		const memory = createDocsLiveMemory();
		const kept = serverWith('Seeded');
		addParagraph(kept, 'Typed before leaving');
		memory.set(`${ME.id}:${PAGE}`, { doc: kept, lineage: `${PAGE}:1`, unsent: true });

		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(serverWith('Rebuilt')));

		expect(binding.getSnapshot()).toMatchObject({
			state: 'fallback',
			fallbackReason: 'lineage_changed',
			unsentEdits: true
		});
		expect(binding.getSnapshot().doc).toBe(kept);
		expect(transport.updates).toHaveLength(0);
	});

	it('marks a left page as holding unconfirmed edits, and lets only its latest binding clear the mark', async () => {
		const memory = createDocsLiveMemory();
		const key = `${ME.id}:${PAGE}`;
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const first = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(server));
		let landFirst: () => void = () => undefined;
		transport.updateAnswer = () =>
			new Promise((resolve) => {
				landFirst = () => resolve({ accepted: true, relayed: false });
			});
		addParagraph(first.getSnapshot().doc, 'Left in the batch window');
		first.destroy();
		await jest.advanceTimersByTimeAsync(0);
		expect(memory.get(key)?.unsent).toBe(true);
		expect(memory.hasUnsent()).toBe(true);

		// The page is opened again before the first view's last edit lands, and left with an edit of its own.
		const again = new FakeTransport();
		again.updateAnswer = () => new Promise(() => undefined);
		const second = bind(again, { memory });
		await settle();
		again.play(syncFrame(server));
		addParagraph(second.getSnapshot().doc, 'Left by the second view');
		second.destroy();
		await jest.advanceTimersByTimeAsync(0);

		landFirst();
		await jest.advanceTimersByTimeAsync(0);
		expect(memory.get(key)?.unsent).toBe(true);
	});

	it('keeps the document of edits live editing stopped with until the page view holds them as its draft', async () => {
		const memory = createDocsLiveMemory();
		const key = `${ME.id}:${PAGE}`;
		const transport = new FakeTransport();
		const binding = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		const { doc } = binding.getSnapshot();

		addParagraph(doc, 'Still in the batch window');
		transport.play({ kind: 'closed', reason: 'shutdown' });
		expect(binding.getSnapshot()).toMatchObject({ state: 'fallback', unsentEdits: true });
		// The page is read again before the view takes the edits: their document stays, and the tab warns on close.
		expect(memory.get(key)).toMatchObject({ doc, unsent: true });
		expect(memory.hasUnsent()).toBe(true);

		binding.draftAdopted();
		expect(memory.get(key)).toBeUndefined();
		expect(memory.hasUnsent()).toBe(false);
	});

	it('leaves the edits of a view left before it took them as its draft to the next visit', async () => {
		const memory = createDocsLiveMemory();
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const first = bind(transport, { memory });
		await settle();
		transport.play(syncFrame(server));
		addParagraph(first.getSnapshot().doc, 'Typed before the close');
		transport.play({ kind: 'closed', reason: 'shutdown' });
		// The view leaves during the reread (or the page is locked): the draft is never taken.
		first.destroy();
		expect(memory.hasUnsent()).toBe(true);

		const again = new FakeTransport();
		const second = bind(again, { memory });
		expect(textOf(second.getSnapshot().doc)).toContain('Typed before the close');
		await settle();
		again.play(syncFrame(server));
		expect(textOf(serverAfter(server, again))).toContain('Typed before the close');
		await expect(second.whenConfirmed()).resolves.toBe(true);
	});

	it('answers once the platform confirmed the edits made so far, after a reconnect too', async () => {
		const server = serverWith('Start');
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(server));
		const { doc } = binding.getSnapshot();
		await expect(binding.whenConfirmed()).resolves.toBe(true);

		let answer: boolean | null = null;
		addParagraph(doc, 'A block given its anchor');
		void binding.whenConfirmed().then((confirmed) => (answer = confirmed));
		await jest.advanceTimersByTimeAsync(0);
		expect(answer).toBeNull();
		await jest.advanceTimersByTimeAsync(75);
		expect(answer).toBe(true);

		// The session is down: the edit waits for the next one.
		transport.current.sink.complete();
		addParagraph(doc, 'Typed while reconnecting');
		answer = null;
		void binding.whenConfirmed().then((confirmed) => (answer = confirmed));
		await jest.advanceTimersByTimeAsync(1_000);
		expect(binding.getSnapshot().state).toBe('reconnecting');
		expect(answer).toBeNull();
		transport.play(syncFrame(serverAfter(server, transport)));
		await jest.advanceTimersByTimeAsync(0);
		expect(answer).toBe(true);
	});

	it('answers false when the edits are not confirmed: the wait runs out, live editing stops, or the view leaves', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		transport.current.sink.complete();
		addParagraph(binding.getSnapshot().doc, 'Never sent');

		const outOfTime = binding.whenConfirmed(5_000);
		await jest.advanceTimersByTimeAsync(5_000);
		await expect(outOfTime).resolves.toBe(false);

		const stopped = binding.whenConfirmed();
		transport.play({ kind: 'closed', reason: 'shutdown' });
		await expect(stopped).resolves.toBe(false);
		await expect(binding.whenConfirmed()).resolves.toBe(false);

		const other = new FakeTransport();
		other.updateAnswer = () => new Promise(() => undefined);
		const left = bind(other);
		await settle();
		other.play(syncFrame(serverWith('Start')));
		addParagraph(left.getSnapshot().doc, 'On its way');
		const leaving = left.whenConfirmed();
		left.destroy();
		await expect(leaving).resolves.toBe(false);
	});

	it('answers false at once when the platform refuses the edits as read-only', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		transport.updateAnswer = () =>
			Promise.reject({ statusCode: 403, errorCode: 'DOCS_LIVE_READ_ONLY', details: { reason: 'locked' } });
		addParagraph(binding.getSnapshot().doc, 'Refused');
		const waited = binding.whenConfirmed();
		await jest.advanceTimersByTimeAsync(75);
		await expect(waited).resolves.toBe(false);
	});

	it('follows a changed name in the presence it sends, in the same session', async () => {
		const transport = new FakeTransport();
		const binding = bind(transport);
		await settle();
		transport.play(syncFrame(serverWith('Start')));
		binding.updateUser({ ...ME, name: 'Me, renamed' });
		expect(binding.getSnapshot().awareness.getLocalState()).toMatchObject({ user: { id: ME.id, name: 'Me, renamed' } });
		await jest.advanceTimersByTimeAsync(200);
		expect(transport.subscriptions).toHaveLength(1);
		expect(transport.awareness.length).toBeGreaterThan(1);
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
