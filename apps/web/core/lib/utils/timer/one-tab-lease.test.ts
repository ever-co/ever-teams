/** @jest-environment jsdom */
/**
 * The tabs of a browser without Web Locks (a page served over plain HTTP) take turns through a lease in the storage
 * they share (#5123): two tabs that wrote the same Keep at once counted its minutes twice.
 */

type LeaseModule = typeof import('./one-tab-lease');

const LEASE_KEY = 'ever-teams.timer.one-tab-lease';

/** A tab of the browser: the module evaluated afresh, as each tab evaluates it. */
function openTab(): LeaseModule {
	let tab: LeaseModule | undefined;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		tab = require('./one-tab-lease') as LeaseModule;
	});
	return tab as LeaseModule;
}

/** Another tab's lease, as it stored it. */
function leaseOfAnotherTab(untilMs: number): void {
	window.localStorage.setItem(LEASE_KEY, JSON.stringify({ tab: 'another-tab', until: untilMs }));
}

const storedLease = () =>
	JSON.parse(window.localStorage.getItem(LEASE_KEY) ?? 'null') as { tab: string; until: number };

/** Lets what waits on the fake clock, and the promises after it, go on. */
const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

/** How long a tab that wrote its lease waits before it reads it back. */
const SETTLE_MS = 250;

describe('one tab at a time, without Web Locks', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date('2026-11-16T10:00:00.000Z') });
		window.localStorage.clear();
		expect((navigator as { locks?: unknown }).locks).toBeUndefined();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

	it('runs at once when no tab holds the lease, holds it meanwhile, and gives it back once done', async () => {
		const tab = openTab();
		expect(tab.ONE_TAB_LEASE_SETTLE_MS).toBe(SETTLE_MS);
		const takenAt = Date.now();
		let release: () => void = () => undefined;
		const settled = tab.inOneTabByLease(
			() =>
				new Promise<string>((resolve) => {
					release = () => resolve('settled');
				})
		);
		await advance(SETTLE_MS);

		expect(storedLease()).toEqual(expect.objectContaining({ until: takenAt + tab.ONE_TAB_LEASE_TTL_MS }));
		expect(tab.isThisTabsTurn()).toBe(true);
		release();
		await expect(settled).resolves.toBe('settled');
		expect(window.localStorage.getItem(LEASE_KEY)).toBeNull();
	});

	it('waits while another tab holds the lease, and runs once it is given back', async () => {
		leaseOfAnotherTab(Date.now() + 20_000);
		const tab = openTab();
		const settle = jest.fn(async () => 'settled');

		const settled = tab.inOneTabByLease(settle);
		await advance(5_000);
		expect(settle).not.toHaveBeenCalled();

		window.localStorage.removeItem(LEASE_KEY);
		await advance(500 + SETTLE_MS);
		await expect(settled).resolves.toBe('settled');
		expect(settle).toHaveBeenCalledTimes(1);
	});

	it('takes over a lease another tab left to expire: it was closed without giving it back', async () => {
		leaseOfAnotherTab(Date.now() + 20_000);
		const tab = openTab();
		const settle = jest.fn(async () => 'settled');

		const settled = tab.inOneTabByLease(settle);
		await advance(19_999);
		expect(settle).not.toHaveBeenCalled();
		await advance(500 + SETTLE_MS);

		await expect(settled).resolves.toBe('settled');
	});

	it('looks again as soon as another tab changes the lease, without waiting for the next look', async () => {
		leaseOfAnotherTab(Date.now() + 20_000);
		const tab = openTab();
		const settle = jest.fn(async () => 'settled');
		const settled = tab.inOneTabByLease(settle);
		await advance(100);

		window.localStorage.removeItem(LEASE_KEY);
		window.dispatchEvent(new StorageEvent('storage', { key: LEASE_KEY, newValue: null }));
		await advance(SETTLE_MS);

		await expect(settled).resolves.toBe('settled');
	});

	it('renews the lease while it holds it, so a long turn (a question, a slot still landing) keeps it', async () => {
		const tab = openTab();
		let release: () => void = () => undefined;
		const settled = tab.inOneTabByLease(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		await advance(SETTLE_MS);

		await advance(2 * tab.ONE_TAB_LEASE_TTL_MS);
		expect(storedLease().until).toBeGreaterThan(Date.now());
		expect(tab.isThisTabsTurn()).toBe(true);
		release();
		await settled;
	});

	it('takes turns with another tab: the second runs only once the first gave the lease back', async () => {
		const first = openTab();
		const second = openTab();
		const order: string[] = [];
		let releaseFirst: () => void = () => undefined;
		const firstSettled = first.inOneTabByLease(async () => {
			order.push('first');
			await new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});
			order.push('first done');
		});
		const secondSettled = second.inOneTabByLease(async () => {
			order.push('second');
		});
		await advance(2_000);
		expect(order).toEqual(['first']);

		releaseFirst();
		await advance(500 + SETTLE_MS);
		await Promise.all([firstSettled, secondSettled]);
		expect(order).toEqual(['first', 'first done', 'second']);
	});

	it("waits when another tab's lease reaches it before it reads its own back: that tab took it out of its sight", async () => {
		const tab = openTab();
		const settle = jest.fn(async () => 'settled');
		const settled = tab.inOneTabByLease(settle);
		await advance(100);

		// Another tab wrote its lease a moment before this one (or renewed it as it was about to write to Gauzy), and
		// that write reaches this tab only now: it lands over this tab's own
		leaseOfAnotherTab(Date.now() + 30_000);
		await advance(SETTLE_MS);
		expect(settle).not.toHaveBeenCalled();
		expect(storedLease().tab).toBe('another-tab');

		// That tab gives it back once its turn is over: this one takes its turn then
		window.localStorage.removeItem(LEASE_KEY);
		await advance(500 + SETTLE_MS);
		await expect(settled).resolves.toBe('settled');
		expect(settle).toHaveBeenCalledTimes(1);
	});

	it("refuses this tab's next write once another tab took the lease, for the rest of the turn", async () => {
		const tab = openTab();
		let release: () => void = () => undefined;
		const settled = tab.inOneTabByLease(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		await advance(SETTLE_MS);
		expect(tab.isThisTabsTurn()).toBe(true);

		// The page was frozen past its lease, and another tab took it
		leaseOfAnotherTab(Date.now() + 30_000);
		expect(tab.isThisTabsTurn()).toBe(false);
		// That tab gave it back: this one still lost its turn, and leaves what it did not write to the next one
		window.localStorage.removeItem(LEASE_KEY);
		expect(tab.isThisTabsTurn()).toBe(false);

		// Another tab holds it as this turn ends: a lease this tab lost is not its own to give back
		leaseOfAnotherTab(Date.now() + 30_000);
		release();
		await settled;
		expect(storedLease().tab).toBe('another-tab');
	});

	it('finds the lease lost when its renewal finds another tab holds it', async () => {
		const tab = openTab();
		let release: () => void = () => undefined;
		const settled = tab.inOneTabByLease(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);
		await advance(SETTLE_MS);

		leaseOfAnotherTab(Date.now() + 30_000);
		await advance(10_000);
		// The renewal left the other tab's lease alone
		expect(storedLease().tab).toBe('another-tab');
		window.localStorage.removeItem(LEASE_KEY);
		expect(tab.isThisTabsTurn()).toBe(false);
		release();
		await settled;
	});

	it('gives the lease back when what it ran fails, so the other tabs are not held back', async () => {
		const tab = openTab();

		const failed = expect(
			tab.inOneTabByLease(async () => Promise.reject(new Error('Network Error')))
		).rejects.toThrow('Network Error');
		await advance(SETTLE_MS);
		await failed;

		expect(window.localStorage.getItem(LEASE_KEY)).toBeNull();
		const again = tab.inOneTabByLease(async () => 'again');
		await advance(SETTLE_MS);
		await expect(again).resolves.toBe('again');
	});

	it('gives the lease back as the page goes away: a reload does not hold the other tabs back', async () => {
		const tab = openTab();
		void tab.inOneTabByLease(() => new Promise<void>(() => undefined));
		await advance(SETTLE_MS);
		expect(window.localStorage.getItem(LEASE_KEY)).not.toBeNull();

		window.dispatchEvent(new Event('pagehide'));

		expect(window.localStorage.getItem(LEASE_KEY)).toBeNull();
	});

	it('gives the lease back as the page goes away while it waits to read it back: a reload does not wait for it', async () => {
		const tab = openTab();
		const settle = jest.fn(async () => 'settled');
		void tab.inOneTabByLease(settle);
		await advance(100);
		expect(storedLease()).not.toBeNull();

		window.dispatchEvent(new Event('pagehide'));

		expect(window.localStorage.getItem(LEASE_KEY)).toBeNull();
		// The reloaded page takes its turn at once, not once the lease expired
		const reloaded = openTab();
		const settled = reloaded.inOneTabByLease(async () => 'reloaded');
		await advance(SETTLE_MS);
		await expect(settled).resolves.toBe('reloaded');
	});

	it('runs the calls of one tab one after the other, as under a lock', async () => {
		const tab = openTab();
		const order: string[] = [];
		let releaseFirst: () => void = () => undefined;
		const first = tab.inOneTabByLease(async () => {
			order.push('first');
			await new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});
			order.push('first done');
		});
		const second = tab.inOneTabByLease(async () => {
			order.push('second');
		});
		await advance(SETTLE_MS);
		expect(order).toEqual(['first']);

		releaseFirst();
		await advance(SETTLE_MS);
		await Promise.all([first, second]);
		expect(order).toEqual(['first', 'first done', 'second']);
	});

	it('acts alone when the browser refuses the storage the tabs share', async () => {
		const tab = openTab();
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});

		await expect(tab.inOneTabByLease(async () => 'settled')).resolves.toBe('settled');
	});

	it('leaves each write to the browser where it has Web Locks: they hold the turn for the tab', () => {
		const tab = openTab();
		Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: jest.fn() } });
		leaseOfAnotherTab(Date.now() + 30_000);

		try {
			expect(tab.isThisTabsTurn()).toBe(true);
		} finally {
			Reflect.deleteProperty(navigator, 'locks');
		}
	});
});
