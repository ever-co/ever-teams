/**
 * Attempt budgets per one-time key: they stay just below the API's own per-key limits, so a browser repeating an
 * Ever ID step is answered by this server (with when to try again) before the API refuses it. An attempt the API did
 * not judge is given back, to the entry that counted it only.
 */
import { AttemptBudget } from './attempts';

const KEY = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';

describe('AttemptBudget', () => {
	it('allows a key its attempts within the window, then says when the window starts again', () => {
		let now = 1_000;
		const budget = new AttemptBudget({ limit: 3, windowMs: 60_000, maxEntries: 100, now: () => now });

		expect([1, 2, 3].map(() => budget.take('key-1').allowed)).toEqual([true, true, true]);
		now = 21_000;
		const refused = budget.take('key-1');
		expect(refused.allowed).toBe(false);
		expect(refused.retryAfterS).toBe(40);
		expect(budget.take('key-2').allowed).toBe(true);

		now = 61_000;
		expect(budget.take('key-1').allowed).toBe(true);
	});

	it('gives an attempt back once, and not for an attempt that did not go ahead', () => {
		const budget = new AttemptBudget({ limit: 1, windowMs: 60_000, now: () => 0 });

		const first = budget.take(KEY);
		expect(first.allowed).toBe(true);
		first.giveBack();
		first.giveBack();
		const second = budget.take(KEY);
		expect(second.allowed).toBe(true);
		const refused = budget.take(KEY);
		expect(refused.allowed).toBe(false);
		refused.giveBack();
		expect(budget.take(KEY).allowed).toBe(false);
	});

	it('gives an attempt back only to the entry that counted it, never to one that replaced it since', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 1, windowMs: 1_000, maxEntries: 1, now: () => now });

		const old = budget.take(KEY);
		// Another key takes the only place, then the key comes back as a new entry and uses its attempt.
		now = 100;
		budget.take('another-key-1234');
		expect(budget.take(KEY).allowed).toBe(true);

		old.giveBack();

		expect(budget.take(KEY).allowed).toBe(false);
	});

	it('stays bounded, dropping expired keys first and the oldest live one only when full', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 1, windowMs: 1_000, maxEntries: 3, now: () => now });

		budget.take('a');
		now = 500;
		budget.take('b');
		budget.take('c');
		// Full of live keys: the oldest one makes room.
		expect(budget.take('d').allowed).toBe(true);
		expect(budget.take('a').allowed).toBe(true);
		// 'b', 'c', 'd' and 'a' all used their single attempt; 'b' went when 'a' came back.
		expect(budget.take('c').allowed).toBe(false);
		expect(budget.take('d').allowed).toBe(false);

		now = 5_000;
		expect(budget.take('c').allowed).toBe(true);
	});

	it('follows the clock of the process when none is given', () => {
		const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
		try {
			const budget = new AttemptBudget({ limit: 1, windowMs: 60_000 });
			expect(budget.take(KEY).allowed).toBe(true);
			now.mockReturnValue(1_030_000);
			expect(budget.take(KEY)).toEqual(expect.objectContaining({ allowed: false, retryAfterS: 30 }));
			now.mockReturnValue(1_060_000);
			expect(budget.take(KEY).allowed).toBe(true);
		} finally {
			now.mockRestore();
		}
	});

	it('keeps no key as such', () => {
		const budget = new AttemptBudget({ limit: 1, windowMs: 1_000 });
		budget.take(KEY);

		expect(
			JSON.stringify([...(budget as unknown as { entries: Map<string, unknown> }).entries.keys()])
		).not.toContain(KEY);
	});
});
