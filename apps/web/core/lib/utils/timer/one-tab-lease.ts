/**
 * One tab of the browser at a time, in a browser without Web Locks (#5123).
 *
 * The time a run went on without the app is settled in one tab at a time, and above all the slots a Keep writes:
 * Gauzy adds every slot it is sent, so two tabs writing the same Keep count its minutes twice. Web Locks do that where
 * the browser has them. A page served over plain HTTP is not a secure context and has none: there, the tabs take
 * turns through a lease kept in the storage they share.
 *
 * - A tab takes the lease when no other tab holds it: none is stored, or the one stored has expired. It renews it while
 *   it holds it, and gives it back once done, or as the page goes away.
 * - A tab that finds another tab's lease waits until that one is given back or expires, then tries again.
 * - The storage of a browser's tabs is not one store written in one step: a tab reads the writes of the others a moment
 *   after they were made, so another tab may have taken the lease (or written what it owes) just before this one, out
 *   of its sight. A tab that takes the lease therefore lets that moment pass (ONE_TAB_LEASE_SETTLE_MS), and only then
 *   reads back whose it is: by then every write made before its own has reached it.
 * - The tab that held the lease renews it each time it is about to write to Gauzy (isThisTabsTurn), and stops when the
 *   lease names another tab. Two tabs whose writes cross so end with one of them: if the holder's last check came
 *   before the other tab's lease reached it, its renewal lands after that lease, and the other tab reads it back and
 *   waits; if it came after, the holder finds the other tab's lease and stops, and what it sent before is recorded,
 *   in a write the other tab reads once its lease settled (owed-keep.ts, whose slot sent without an answer #5367
 *   judges).
 * - A tab whose lease expired while it held it (the browser froze the page) finds another tab's lease at that check and
 *   stops too: the other tab goes on from what is recorded.
 *
 * Without storage (the browser blocks it, or refuses the write) nothing can be shared: the tab acts alone.
 */

const LEASE_KEY = 'ever-teams.timer.one-tab-lease';
/** How long a lease holds unless renewed: a tab gone without giving it back holds the others back that long. */
export const ONE_TAB_LEASE_TTL_MS = 30_000;
/**
 * How long a tab that wrote its lease waits before it reads it back: well above the time the writes of another tab
 * take to reach it (a few milliseconds, more on a busy computer), twice over.
 */
export const ONE_TAB_LEASE_SETTLE_MS = 250;
const RENEW_EVERY_MS = 10_000;
/** How soon a tab that waits for the lease looks at it again, besides when the storage event tells it of a change. */
const LOOK_AGAIN_MS = 500;

interface Lease {
	tab: string;
	/** When it expires, on the computer's clock. */
	until: number;
}

let thisTab: string | null = null;

/** This tab's id, random and the same for every lease it takes. */
function thisTabId(): string {
	if (thisTab) return thisTab;
	const random =
		typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
			? Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(36)).join('')
			: Math.random().toString(36).slice(2);
	thisTab = `${Date.now().toString(36)}-${random}`;
	return thisTab;
}

function sharedStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}

function readLease(storage: Storage): Lease | null {
	try {
		const lease = JSON.parse(storage.getItem(LEASE_KEY) ?? 'null') as Partial<Lease> | null;
		return typeof lease?.tab === 'string' && typeof lease.until === 'number' && Number.isFinite(lease.until)
			? (lease as Lease)
			: null;
	} catch {
		return null;
	}
}

/** Writes this tab's lease; false when the storage refused it. */
function writeLease(storage: Storage, until: number): boolean {
	try {
		storage.setItem(LEASE_KEY, JSON.stringify({ tab: thisTabId(), until } satisfies Lease));
		return true;
	} catch {
		return false;
	}
}

/**
 * How this tab takes its turn now: `alone` (nothing to share the turn through), `lease` (it took the lease), `lost`
 * (another tab took the lease meanwhile), or null outside a turn. One turn at a time per tab (the queue below).
 */
let turn: 'alone' | 'lease' | 'lost' | null = null;
let holding: { renewal: ReturnType<typeof setInterval>; onPageHide: () => void } | null = null;
let queue: Promise<unknown> = Promise.resolve();

function stopHolding(): void {
	if (!holding) return;
	clearInterval(holding.renewal);
	if (typeof window !== 'undefined') window.removeEventListener('pagehide', holding.onPageHide);
	holding = null;
}

function giveBack(storage: Storage): void {
	stopHolding();
	try {
		if (readLease(storage)?.tab === thisTabId()) storage.removeItem(LEASE_KEY);
	} catch {
		// A storage that cannot be reached: the lease expires on its own
	}
}

/** Renews the lease while this tab holds it, and gives it back as the page goes away (a reload, a closed tab). */
function hold(storage: Storage): void {
	const renewal = setInterval(() => {
		if (readLease(storage)?.tab !== thisTabId()) {
			// Another tab took it: what this one writes next is refused (isThisTabsTurn)
			turn = 'lost';
			stopHolding();
			return;
		}
		writeLease(storage, Date.now() + ONE_TAB_LEASE_TTL_MS);
	}, RENEW_EVERY_MS);
	const onPageHide = () => giveBack(storage);
	if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);
	holding = { renewal, onPageHide };
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/** Resolves after `waitMs`, or sooner when another tab changes the lease (the storage event). */
function lookAgainSoon(waitMs: number): Promise<void> {
	return new Promise((resolve) => {
		const done = () => {
			clearTimeout(timer);
			window.removeEventListener('storage', onStorage);
			resolve();
		};
		const onStorage = (event: StorageEvent) => {
			if (event.key === LEASE_KEY || event.key === null) done();
		};
		const timer = setTimeout(done, waitMs);
		window.addEventListener('storage', onStorage);
	});
}

/** Waits for this tab's turn: the lease taken, or nothing to share it through. */
async function takeTurn(): Promise<Storage | null> {
	const storage = sharedStorage();
	if (!storage) return null;
	for (;;) {
		const now = Date.now();
		const lease = readLease(storage);
		if (!lease || lease.tab === thisTabId() || lease.until <= now) {
			if (!writeLease(storage, now + ONE_TAB_LEASE_TTL_MS)) return null;
			// A storage that does not keep what it is given has nothing to share the turn through
			if (!readLease(storage)) return null;
			// Another tab's lease, written out of this tab's sight a moment ago (or its renewal as it was about to write),
			// reaches it meanwhile and is then the one read back: that tab keeps its turn, and this one waits for it
			await wait(ONE_TAB_LEASE_SETTLE_MS);
			if (readLease(storage)?.tab === thisTabId()) return storage;
			continue;
		}
		await lookAgainSoon(Math.max(1, Math.min(lease.until - now, LOOK_AGAIN_MS)));
	}
}

async function inTurn<T>(settle: () => Promise<T>): Promise<T> {
	const storage = await takeTurn();
	turn = storage ? 'lease' : 'alone';
	if (storage) hold(storage);
	try {
		return await settle();
	} finally {
		turn = null;
		if (storage) giveBack(storage);
	}
}

/**
 * Runs `settle` in one tab of the browser at a time, through a lease in the storage the tabs share: the Web Locks
 * fallback of inOneTabAtATime (unfollowed-time.ts). Calls of the same tab run one after the other, as under a lock.
 */
export function inOneTabByLease<T>(settle: () => Promise<T>): Promise<T> {
	const run = queue.then(() => inTurn(settle));
	queue = run.catch(() => undefined);
	return run;
}

function hasWebLocks(): boolean {
	return typeof navigator !== 'undefined' && !!navigator.locks;
}

/**
 * Whether this tab may still send what one tab at a time sends, asked again just before each write to Gauzy: true
 * under Web Locks, which the browser holds for the tab, and for a tab that acts alone. Under the lease, true while the
 * lease names this tab. False once another tab took it: it took over, from what is recorded.
 *
 * Not a plain read, on purpose: a write is about to go, so a lease that still names this tab is renewed for it, and a
 * lease found taken ends this tab's hold for the rest of its turn (it stops renewing, and every later check is false).
 */
export function isThisTabsTurn(): boolean {
	if (hasWebLocks() || turn === 'alone' || turn === null) return true;
	if (turn === 'lost') return false;
	const storage = sharedStorage();
	if (!storage) return true;
	if (readLease(storage)?.tab !== thisTabId()) {
		turn = 'lost';
		stopHolding();
		return false;
	}
	writeLease(storage, Date.now() + ONE_TAB_LEASE_TTL_MS);
	return true;
}
