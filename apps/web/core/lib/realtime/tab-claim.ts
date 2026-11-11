/**
 * One tab of the browser acts on an event that every tab receives (realtime-client FR-8).
 *
 * Each tab keeps its own live connection, so an event reaches every open tab of the person. A sound (or anything
 * else the person should notice once) is claimed by key first: the first tab to claim a key acts, every other tab
 * that claims the same key afterwards — at once, or minutes later when a sleeping tab replays what it missed —
 * is told no.
 *
 * The claims are entries of the origin's `localStorage` (one per key, with an expiry), so a tab that was asleep
 * when the others answered still finds them; a message on a `BroadcastChannel` would be gone by then. Where the
 * browser has Web Locks, the read and the write of a claim run under one exclusive lock shared by the tabs of the
 * origin, so exactly one tab takes a key. Without them, a tab writes its claim, waits a moment and reads it back:
 * when two tabs write at the same moment, the later write is the one both read back. Without storage (a private
 * window that refuses it), there is nothing to share and the tab acts on its own.
 */

/** The prefix of every claim's storage entry. */
export const TAB_CLAIM_PREFIX = 'ever-teams.tab-claim.';

/** How long a claim holds: longer than a tab can be asleep and still treat the event as new. */
export const TAB_CLAIM_TTL_MS = 10 * 60_000;

/** The Web Lock the claims are read and written under. */
const TAB_CLAIM_LOCK = 'ever-teams.tab-claims';

/** How long a tab without Web Locks waits before reading its claim back. */
export const TAB_CLAIM_SETTLE_MS = 60;

/** The parts of `Storage` the claims use. */
export type TabClaimStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** The part of `LockManager` the claims use. */
export interface TabClaimLocks {
	request<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
}

/** Where a claim is taken: the browser's, or a test's. */
export interface TabClaimEnvironment {
	storage: TabClaimStorage | null;
	locks: TabClaimLocks | null;
	now: () => number;
	wait: (ms: number) => Promise<void>;
	/** This tab's own id, the same for every claim it takes. */
	tabId: string;
}

interface TabClaimOptions {
	/**
	 * Waits this long before claiming. A hidden tab yields to a visible one this way: both receive the event at about
	 * the same moment, and the tab the person is looking at claims first.
	 */
	yieldMs?: number;
	environment?: TabClaimEnvironment;
}

interface StoredClaim {
	tab: string;
	until: number;
}

function readClaim(storage: TabClaimStorage, entry: string): StoredClaim | null {
	const raw = storage.getItem(entry);
	if (!raw) return null;
	const separator = raw.lastIndexOf('|');
	const until = Number(raw.slice(separator + 1));
	if (separator <= 0 || !Number.isFinite(until)) return null;
	return { tab: raw.slice(0, separator), until };
}

/** Removes the claims that have expired, so the storage never fills with them. */
export function pruneTabClaims(storage: TabClaimStorage, now: number): void {
	const expired: string[] = [];
	for (let index = 0; index < storage.length; index += 1) {
		const entry = storage.key(index);
		if (!entry?.startsWith(TAB_CLAIM_PREFIX)) continue;
		const claim = readClaim(storage, entry);
		if (!claim || claim.until <= now) expired.push(entry);
	}
	for (const entry of expired) storage.removeItem(entry);
}

/** Whether another tab holds the key now. */
function isHeldElsewhere(claim: StoredClaim | null, tabId: string, now: number): boolean {
	return !!claim && claim.until > now && claim.tab !== tabId;
}

function write(storage: TabClaimStorage, entry: string, tabId: string, until: number): boolean {
	try {
		storage.setItem(entry, `${tabId}|${until}`);
		return true;
	} catch {
		return false;
	}
}

/** Read and write in one step: only called under the lock shared by the tabs. */
function takeUnderLock(environment: TabClaimEnvironment, storage: TabClaimStorage, entry: string): boolean {
	const now = environment.now();
	pruneTabClaims(storage, now);
	if (isHeldElsewhere(readClaim(storage, entry), environment.tabId, now)) return false;
	// A storage that refuses the write (full) cannot be shared: the tab acts rather than nobody acting.
	write(storage, entry, environment.tabId, now + TAB_CLAIM_TTL_MS);
	return true;
}

/** Without Web Locks: write, let the other tabs' writes land, and read back whose claim it is. */
async function takeByReadBack(
	environment: TabClaimEnvironment,
	storage: TabClaimStorage,
	entry: string
): Promise<boolean> {
	const now = environment.now();
	pruneTabClaims(storage, now);
	if (isHeldElsewhere(readClaim(storage, entry), environment.tabId, now)) return false;
	if (!write(storage, entry, environment.tabId, now + TAB_CLAIM_TTL_MS)) return true;
	await environment.wait(TAB_CLAIM_SETTLE_MS);
	return readClaim(storage, entry)?.tab === environment.tabId;
}

/**
 * Claims a key for this tab.
 *
 * @param key What is claimed: an event, or the record it is about (`inbox-<itemId>`).
 * @returns Whether this tab is the one that acts on it. A tab claiming a key it already holds is told yes again.
 */
export async function claimForThisTab(key: string, options: TabClaimOptions = {}): Promise<boolean> {
	const environment = options.environment ?? browserTabClaimEnvironment();
	if (options.yieldMs && options.yieldMs > 0) await environment.wait(options.yieldMs);
	const storage = environment.storage;
	if (!storage) return true;
	const entry = TAB_CLAIM_PREFIX + key;
	try {
		const locks = environment.locks;
		if (!locks) return await takeByReadBack(environment, storage, entry);
		return await locks.request(TAB_CLAIM_LOCK, () => takeUnderLock(environment, storage, entry));
	} catch {
		// A storage or lock that throws mid-claim (a revoked permission) leaves the tab on its own.
		return true;
	}
}

let browserTabId: string | null = null;

function newTabId(): string {
	if (typeof crypto === 'undefined') return Date.now().toString(36);
	// `randomUUID` exists in secure contexts only; random values everywhere.
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(36)).join('-');
}

function browserStorage(): TabClaimStorage | null {
	try {
		return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
	} catch {
		// Storage refused (a private window, blocked site data).
		return null;
	}
}

/** This browser's storage and locks, and this tab's id. */
function browserTabClaimEnvironment(): TabClaimEnvironment {
	browserTabId ??= newTabId();
	const locks = typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null;
	return {
		storage: browserStorage(),
		// The lock awaits a callback's promise and answers its value; the DOM typing names the promise itself.
		locks: locks
			? { request: <T>(name: string, callback: () => Promise<T> | T) => locks.request(name, callback) as Promise<T> }
			: null,
		now: () => Date.now(),
		wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
		tabId: browserTabId
	};
}
