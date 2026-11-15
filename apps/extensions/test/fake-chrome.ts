// Test-only: the part of the extension API the session code uses, with the local storage in memory.
export function installFakeChrome(initial: Record<string, unknown> = {}) {
	const stored = new Map<string, unknown>(Object.entries(initial));
	const keysOf = (keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]);
	const local = {
		get: async (keys: string | string[]) => {
			const answer: Record<string, unknown> = {};
			for (const key of keysOf(keys)) {
				if (stored.has(key)) {
					answer[key] = structuredClone(stored.get(key));
				}
			}
			return answer;
		},
		set: async (items: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(items)) {
				stored.set(key, structuredClone(value));
			}
		},
		remove: async (keys: string | string[]) => {
			for (const key of keysOf(keys)) {
				stored.delete(key);
			}
		}
	};
	(globalThis as unknown as { chrome: unknown }).chrome = { storage: { local } };
	return { stored };
}

type Listener = (...args: never[]) => unknown;

/** An event of the extension API: listeners added by the code under test, called by the test. */
function fakeEvent() {
	const listeners: Listener[] = [];
	return {
		addListener: (listener: Listener) => {
			listeners.push(listener);
		},
		removeListener: (listener: Listener) => {
			listeners.splice(listeners.indexOf(listener) >>> 0, 1);
		},
		emit: (...args: unknown[]) => {
			// A copy: a listener may remove itself while the event is told
			for (const listener of listeners.slice()) {
				(listener as (...values: unknown[]) => unknown)(...args);
			}
		}
	};
}

/** A port the popup opens to the background: what the background posts to it, or a port already gone. */
export interface FakePort {
	sender: { id: string; tab?: unknown };
	received: unknown[];
	postMessage: (message: unknown) => void;
	disconnect: () => void;
	onDisconnect: ReturnType<typeof fakeEvent>;
	onMessage: ReturnType<typeof fakeEvent>;
}

/**
 * Test-only: the part of the extension API the background uses, on top of installFakeChrome: the storage change
 * events (sent after the change, as the browser does), the alarms, the ports the popup opens and the toolbar badge.
 */
export function installFakeExtension(initial: Record<string, unknown> = {}) {
	const { stored } = installFakeChrome(initial);
	const chromeLike = (globalThis as unknown as { chrome: Record<string, any> }).chrome;
	const local = chromeLike.storage.local;
	const onChanged = fakeEvent();
	const changesOf = (keys: string[], next: Record<string, unknown>) => {
		const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
		for (const key of keys) {
			changes[key] = { oldValue: stored.get(key), newValue: next[key] };
		}
		return changes;
	};
	const set = local.set;
	const remove = local.remove;
	local.set = async (items: Record<string, unknown>) => {
		const changes = changesOf(Object.keys(items), items);
		await set(items);
		setTimeout(() => onChanged.emit(changes, 'local'), 0);
	};
	local.remove = async (keys: string | string[]) => {
		const list = (Array.isArray(keys) ? keys : [keys]).filter((key) => stored.has(key));
		const changes = changesOf(list, {});
		await remove(keys);
		setTimeout(() => onChanged.emit(changes, 'local'), 0);
	};
	chromeLike.storage.onChanged = onChanged;

	let colorSet: Promise<void> | null = null;
	const badge = {
		text: '',
		history: [] as string[],
		/** Holds the next color calls until the returned function is called, as a slow browser would. */
		holdColor: () => {
			let release = () => undefined as void;
			colorSet = new Promise<void>((resolve) => {
				release = () => {
					colorSet = null;
					resolve();
				};
			});
			return release;
		}
	};
	chromeLike.action = {
		setBadgeText: ({ text }: { text: string }) => {
			badge.text = text;
			badge.history.push(text);
			return Promise.resolve();
		},
		setBadgeBackgroundColor: async () => {
			await colorSet;
		}
	};
	const alarms = { created: [] as string[], onAlarm: fakeEvent() };
	chromeLike.alarms = { create: (name: string) => alarms.created.push(name), onAlarm: alarms.onAlarm };
	const runtime = { onInstalled: fakeEvent(), onStartup: fakeEvent(), onConnect: fakeEvent() };
	chromeLike.runtime = runtime;

	/** The popup opens a port; a port already gone throws on each post, as the browser's does. */
	const connect = ({ gone = false } = {}): FakePort => {
		const port: FakePort = {
			sender: { id: 'extension-id' },
			received: [],
			postMessage: (message: unknown) => {
				if (gone) {
					throw new Error('Attempting to use a disconnected port object');
				}
				port.received.push(message);
			},
			disconnect: () => undefined,
			onDisconnect: fakeEvent(),
			onMessage: fakeEvent()
		};
		runtime.onConnect.emit(port);
		return port;
	};

	return { stored, badge, alarms, runtime, connect };
}

type FetchAnswer = { status: number; body?: unknown };

/** Replaces fetch: each call is recorded and answered by `answer`, or fails as offline when it throws. */
export function installFakeFetch(answer: (url: string, init: RequestInit) => FetchAnswer | Promise<FetchAnswer>) {
	const calls: Array<{ url: string; init: RequestInit; body: unknown }> = [];
	globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
		const url = String(input);
		const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ url, init, body });
		const { status, body: answered } = await answer(url, init);
		return new Response(answered === undefined ? null : JSON.stringify(answered), { status });
	}) as typeof fetch;
	return calls;
}
