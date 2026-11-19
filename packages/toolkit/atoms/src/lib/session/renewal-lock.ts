// The renewals of one API address and organization run one at a time across the site's tabs: a renewal token works
// once, and the API ends the whole sign-in when one is presented twice. Web Locks hold the lock where the browser has
// them; elsewhere a lock written in localStorage does. That fallback is best effort: localStorage cannot compare and
// set, and a tab the browser freezes past the lock's time may still renew. The API's reuse check then ends the sign-in,
// and the person signs in again: it never lets a token through.

const LOCK_PREFIX = 'ever-teams:renewal:';

// The storage lock is held at most this long without news of its tab: a tab closed during a renewal frees it.
export const STORAGE_LOCK_TTL_MS = 15_000;
// How often the tab that holds the storage lock says it still runs, and how often a waiting tab looks again.
const STORAGE_LOCK_HEARTBEAT_MS = 5_000;
const STORAGE_LOCK_POLL_MS = 100;
// localStorage has no compare-and-set: a tab that wrote the lock reads it back after this long, to see whether another
// tab wrote it at the same moment.
const STORAGE_LOCK_SETTLE_MS = 50;

interface StorageLock {
	owner: string;
	until: number;
}

type WebLocks = { request<T>(name: string, run: () => Promise<T>): Promise<T> };

function webLocks(): WebLocks | null {
	if (typeof navigator === 'undefined') {
		return null;
	}
	const locks = (navigator as Navigator & { locks?: WebLocks }).locks;
	if (typeof locks?.request !== 'function') {
		return null;
	}
	return locks;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const newOwner = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function readLock(name: string): StorageLock | null {
	const saved = window.localStorage.getItem(name);
	if (!saved) {
		return null;
	}
	try {
		const lock = JSON.parse(saved) as Partial<StorageLock>;
		const isLock = typeof lock.owner === 'string' && typeof lock.until === 'number';
		if (!isLock) {
			return null;
		}
		return lock as StorageLock;
	} catch {
		return null;
	}
}

function writeLock(name: string, owner: string): void {
	const lock: StorageLock = { owner, until: Date.now() + STORAGE_LOCK_TTL_MS };
	window.localStorage.setItem(name, JSON.stringify(lock));
}

function isHeldByAnother(lock: StorageLock | null, owner: string): boolean {
	if (!lock || lock.owner === owner) {
		return false;
	}
	return lock.until > Date.now();
}

async function acquireStorageLock(name: string, owner: string): Promise<void> {
	for (;;) {
		if (isHeldByAnother(readLock(name), owner)) {
			await wait(STORAGE_LOCK_POLL_MS);
			continue;
		}
		writeLock(name, owner);
		await wait(STORAGE_LOCK_SETTLE_MS);
		if (readLock(name)?.owner === owner) {
			return;
		}
	}
}

function releaseStorageLock(name: string, owner: string): void {
	try {
		if (readLock(name)?.owner === owner) {
			window.localStorage.removeItem(name);
		}
	} catch {
		// The lock lapses by itself once its time is over.
	}
}

function extendStorageLock(name: string, owner: string): void {
	try {
		// A tab the browser paused past the lock's time finds it taken by another: that tab keeps it.
		if (readLock(name)?.owner !== owner) {
			return;
		}
		writeLock(name, owner);
	} catch {
		// Refused once: the lock still holds until its time is over.
	}
}

function storageAvailable(): boolean {
	try {
		return typeof window !== 'undefined' && Boolean(window.localStorage);
	} catch {
		return false;
	}
}

async function withStorageLock<T>(name: string, run: () => Promise<T>): Promise<T> {
	// Without storage there is no other tab to share a renewal token with: the token is kept in this tab's memory.
	if (!storageAvailable()) {
		return run();
	}
	const owner = newOwner();
	try {
		await acquireStorageLock(name, owner);
	} catch {
		// The browser refused the write: another tab may hold the same saved renewal token, so none is presented
		// without the lock. A token kept in this tab's memory alone is renewed without it (site-session.ts).
		throw new Error('the browser refused to write the renewal lock to its storage');
	}
	const heartbeat = setInterval(() => extendStorageLock(name, owner), STORAGE_LOCK_HEARTBEAT_MS);
	try {
		return await run();
	} finally {
		clearInterval(heartbeat);
		releaseStorageLock(name, owner);
	}
}

/**
 * Runs `run` once no other tab of the site renews for this scope (an API address and organization), and holds the
 * others until it ends.
 */
export function withRenewalLock<T>(scope: string, run: () => Promise<T>): Promise<T> {
	const name = LOCK_PREFIX + scope;
	const locks = webLocks();
	if (locks) {
		return locks.request(name, run);
	}
	return withStorageLock(name, run);
}
