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
