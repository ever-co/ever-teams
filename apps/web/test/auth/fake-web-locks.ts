/**
 * Test-only (never part of the app). The Web Locks of a browser (`navigator.locks`), which jsdom does not have: one
 * holder at a time per name, shared by the tabs of an origin, and a request that waits can be given up with its
 * signal.
 */
type LockCallback = (lock: { name: string }) => unknown;
type Waiter = { isCancelled: boolean; hold: () => Promise<void> };

export function installFakeWebLocks() {
	const heldNames = new Set<string>();
	const waiters = new Map<string, Waiter[]>();

	const grantNext = (name: string) => {
		if (heldNames.has(name)) return;
		const next = waiters.get(name)?.shift();
		if (!next) return;
		if (next.isCancelled) {
			grantNext(name);
			return;
		}
		heldNames.add(name);
		void next.hold().finally(() => {
			heldNames.delete(name);
			grantNext(name);
		});
	};

	const request = (name: string, optionsOrCallback: unknown, maybeCallback?: LockCallback) => {
		const callback = maybeCallback ?? (optionsOrCallback as LockCallback);
		const signal = maybeCallback ? (optionsOrCallback as { signal?: AbortSignal }).signal : undefined;

		return new Promise((resolve, reject) => {
			let isGranted = false;
			const waiter: Waiter = {
				isCancelled: false,
				hold: async () => {
					isGranted = true;
					try {
						resolve(await callback({ name }));
					} catch (error) {
						reject(error);
					}
				}
			};
			signal?.addEventListener('abort', () => {
				if (isGranted) return;
				waiter.isCancelled = true;
				reject(new DOMException('The lock request was given up.', 'AbortError'));
			});
			waiters.set(name, [...(waiters.get(name) ?? []), waiter]);
			grantNext(name);
		});
	};

	Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });

	return {
		/** Another tab holds the lock, until the function this answers is called. */
		holdFromAnotherTab: (name: string): (() => void) => {
			let release: () => void = () => undefined;
			void request(name, () => new Promise<void>((resolve) => (release = resolve)));
			return () => release();
		},
		/** The browser is as jsdom makes it again: without Web Locks. */
		remove: () => {
			Reflect.deleteProperty(navigator, 'locks');
		}
	};
}
