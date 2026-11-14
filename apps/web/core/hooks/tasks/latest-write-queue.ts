export type LatestWriteQueue = {
	/** Sends `write` now if no write of `key` is on its way; otherwise keeps it as the next one, in place of any older. */
	enqueue: (key: string, write: () => Promise<unknown>) => void;
};

/**
 * One write at a time per key, the latest one asked for going next. Writes of one key sent at once could reach the
 * server in any order, and an older one landing last would overwrite the newer value. Here a write waits while one of
 * its key is on its way, a newer write replaces the one waiting, and the waiting one goes once the write on its way
 * ends, saved, refused or failed: the last write sent for a key is always the latest one asked for.
 */
export function createLatestWriteQueue(): LatestWriteQueue {
	// A key is here while one of its writes is on its way; its value is the write waiting to go next, if any.
	const waiting = new Map<string, (() => Promise<unknown>) | null>();

	async function sendInTurn(key: string, first: () => Promise<unknown>) {
		let next: (() => Promise<unknown>) | null = first;
		while (next) {
			waiting.set(key, null);
			try {
				await next();
			} catch (error) {
				// A write reports its own failure; should one still throw, the write waiting goes all the same.
				console.error('Could not send a write', error);
			}
			next = waiting.get(key) ?? null;
		}
		waiting.delete(key);
	}

	return {
		enqueue(key, write) {
			if (waiting.has(key)) {
				waiting.set(key, write);
				return;
			}
			void sendInTurn(key, write);
		}
	};
}
