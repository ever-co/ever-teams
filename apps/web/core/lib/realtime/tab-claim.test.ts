import {
	claimForThisTab,
	pruneTabClaims,
	releaseTabClaim,
	TAB_CLAIM_PREFIX,
	TAB_CLAIM_SETTLE_MS,
	TAB_CLAIM_TTL_MS,
	type TabClaimEnvironment,
	type TabClaimLocks,
	type TabClaimStorage
} from './tab-claim';

/** A `Storage` over a map. */
class MapStorage implements TabClaimStorage {
	constructor(readonly values = new Map<string, string>()) {}
	get length() {
		return this.values.size;
	}
	key(index: number) {
		return [...this.values.keys()][index] ?? null;
	}
	getItem(key: string) {
		return this.values.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.values.set(key, String(value));
	}
	removeItem(key: string) {
		this.values.delete(key);
	}
}

/**
 * The origin's storage as tabs in different processes see it: each tab reads its own copy at once, and the writes
 * reach the shared store, in the order they were made, only when `propagate` runs — after which every tab reads
 * the same values (the last write of a key wins).
 */
class LaggingOrigin {
	private readonly shared = new Map<string, string>();
	private readonly pending: Array<[string, string | null]> = [];
	private readonly views: MapStorage[] = [];

	view(): TabClaimStorage {
		const local = new MapStorage(new Map(this.shared));
		this.views.push(local);
		const pending = this.pending;
		return {
			get length() {
				return local.length;
			},
			key: (index) => local.key(index),
			getItem: (key) => local.getItem(key),
			setItem: (key, value) => {
				local.setItem(key, value);
				pending.push([key, value]);
			},
			removeItem: (key) => {
				local.removeItem(key);
				pending.push([key, null]);
			}
		};
	}

	propagate(): void {
		for (const [key, value] of this.pending.splice(0)) {
			if (value === null) this.shared.delete(key);
			else this.shared.set(key, value);
		}
		for (const view of this.views) {
			view.values.clear();
			for (const [key, value] of this.shared) view.values.set(key, value);
		}
	}
}

/** Web Locks for one origin: the callbacks of one name run one after the other. */
function fakeLocks(): TabClaimLocks {
	const tails = new Map<string, Promise<unknown>>();
	return {
		request<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
			const previous = tails.get(name) ?? Promise.resolve();
			const run = previous.then(() => callback());
			tails.set(
				name,
				run.catch(() => undefined)
			);
			return run;
		}
	};
}

function tab(tabId: string, overrides: Partial<TabClaimEnvironment> = {}): TabClaimEnvironment {
	return {
		storage: null,
		locks: null,
		now: () => 1_000_000,
		wait: () => Promise.resolve(),
		tabId,
		...overrides
	};
}

describe('claimForThisTab', () => {
	it('lets the first tab take a key and tells every other tab no', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();

		await expect(claimForThisTab('inbox-1', { environment: tab('a', { storage, locks }) })).resolves.toBe(true);
		await expect(claimForThisTab('inbox-1', { environment: tab('b', { storage, locks }) })).resolves.toBe(false);
		await expect(claimForThisTab('inbox-1', { environment: tab('c', { storage, locks }) })).resolves.toBe(false);
	});

	it('answers yes once per key, so the tab that acted is not told to act again, and keys are independent', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();

		await claimForThisTab('inbox-1', { environment: tab('a', { storage, locks }) });

		await expect(claimForThisTab('inbox-1', { environment: tab('a', { storage, locks }) })).resolves.toBe(false);
		await expect(claimForThisTab('inbox-2', { environment: tab('b', { storage, locks }) })).resolves.toBe(true);
	});

	it('gives exactly one of several tabs claiming at once the key, under the shared lock', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();

		const answers = await Promise.all(
			['a', 'b', 'c', 'd'].map((id) => claimForThisTab('inbox-1', { environment: tab(id, { storage, locks }) }))
		);

		expect(answers.filter(Boolean)).toHaveLength(1);
	});

	it('still holds the key for a tab that wakes up minutes later, and frees it once the claim expired', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();
		let now = 1_000_000;
		const at = (id: string) => tab(id, { storage, locks, now: () => now });

		await claimForThisTab('inbox-1', { environment: at('a') });
		now += TAB_CLAIM_TTL_MS - 1;
		await expect(claimForThisTab('inbox-1', { environment: at('b') })).resolves.toBe(false);

		now += 2;
		await expect(claimForThisTab('inbox-1', { environment: at('b') })).resolves.toBe(true);
	});

	it('without Web Locks, gives the key to the tab whose write landed last when two tabs write at once', async () => {
		const origin = new LaggingOrigin();
		let release: () => void = () => undefined;
		const settled = new Promise<void>((resolve) => {
			release = resolve;
		});
		const waits: number[] = [];
		const wait = (ms: number) => {
			waits.push(ms);
			return settled;
		};

		// Neither tab sees the other's claim yet: both write, then read back after the writes have reached each other.
		const first = claimForThisTab('inbox-1', { environment: tab('a', { storage: origin.view(), wait }) });
		const second = claimForThisTab('inbox-1', { environment: tab('b', { storage: origin.view(), wait }) });
		await Promise.resolve();
		origin.propagate();
		release();

		await expect(first).resolves.toBe(false);
		await expect(second).resolves.toBe(true);
		expect(waits).toEqual([TAB_CLAIM_SETTLE_MS, TAB_CLAIM_SETTLE_MS]);
	});

	it('without Web Locks, tells a tab no at once when another tab already holds the key', async () => {
		const storage = new MapStorage();
		const wait = jest.fn(() => Promise.resolve());

		await expect(claimForThisTab('inbox-1', { environment: tab('a', { storage, wait }) })).resolves.toBe(true);
		wait.mockClear();
		await expect(claimForThisTab('inbox-1', { environment: tab('b', { storage, wait }) })).resolves.toBe(false);
		expect(wait).not.toHaveBeenCalled();
	});

	it('lets a tab act on its own when there is no storage to share, or the storage refuses the claim', async () => {
		await expect(claimForThisTab('inbox-1', { environment: tab('a') })).resolves.toBe(true);

		const full = new MapStorage();
		full.setItem = () => {
			throw new Error('QuotaExceededError');
		};
		await expect(
			claimForThisTab('inbox-1', { environment: tab('a', { storage: full, locks: fakeLocks() }) })
		).resolves.toBe(true);
		await expect(claimForThisTab('inbox-1', { environment: tab('b', { storage: full }) })).resolves.toBe(true);
	});

	it('waits the yield before claiming, so a visible tab claims before a hidden one', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();
		let release: () => void = () => undefined;
		const hiddenWait = jest.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				})
		);

		const hidden = claimForThisTab('inbox-1', {
			yieldMs: 400,
			environment: tab('hidden', { storage, locks, wait: hiddenWait })
		});
		const visible = claimForThisTab('inbox-1', { environment: tab('visible', { storage, locks }) });
		await expect(visible).resolves.toBe(true);
		release();

		await expect(hidden).resolves.toBe(false);
		expect(hiddenWait).toHaveBeenCalledWith(400);
	});
});

describe('pruneTabClaims', () => {
	it('removes the expired and unreadable claims and leaves everything else alone', () => {
		const storage = new MapStorage(
			new Map([
				[`${TAB_CLAIM_PREFIX}old`, 'a|999'],
				[`${TAB_CLAIM_PREFIX}live`, 'a|2000'],
				[`${TAB_CLAIM_PREFIX}broken`, 'garbage'],
				['someone-else', 'a|1']
			])
		);

		pruneTabClaims(storage, 1000);

		expect([...storage.values.keys()].sort()).toEqual([`${TAB_CLAIM_PREFIX}live`, 'someone-else']);
	});
});

describe('releaseTabClaim', () => {
	it('gives back a claim the tab did not act on, so the next claim of the key acts', async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();
		await claimForThisTab('reminder-1', { environment: tab('a', { storage, locks }) });

		releaseTabClaim('reminder-1', { environment: tab('a', { storage, locks }) });

		await expect(claimForThisTab('reminder-1', { environment: tab('b', { storage, locks }) })).resolves.toBe(true);
	});

	it("leaves another tab's claim alone", async () => {
		const storage = new MapStorage();
		const locks = fakeLocks();
		await claimForThisTab('reminder-1', { environment: tab('a', { storage, locks }) });

		releaseTabClaim('reminder-1', { environment: tab('b', { storage, locks }) });

		await expect(claimForThisTab('reminder-1', { environment: tab('c', { storage, locks }) })).resolves.toBe(false);
	});
});
