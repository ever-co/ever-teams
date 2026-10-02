/**
 * Attempt budgets per one-time key: one browser repeating an Ever ID step cannot use up the API's limits that every
 * other person shares, because a key that used its budget, or comes back too soon, is answered here without calling
 * the API. An attempt the API did not judge is given back.
 */
import { AttemptBudget } from './attempts';

const KEY = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';

describe('AttemptBudget', () => {
	it('allows a key its budget within the window, then refuses it until the window ends', () => {
		let now = 1_000;
		const budget = new AttemptBudget({ limit: 3, windowMs: 60_000, maxEntries: 100, now: () => now });

		expect([1, 2, 3].map(() => budget.take('key-1').verdict)).toEqual(['ok', 'ok', 'ok']);
		expect(budget.take('key-1').verdict).toBe('exhausted');
		expect(budget.take('key-2').verdict).toBe('ok');

		now += 60_000;
		expect(budget.take('key-1').verdict).toBe('ok');
	});

	it('keeps a minimum interval between two attempts with one key, without counting the early one', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 2, windowMs: 600_000, minIntervalMs: 15_000, now: () => now });

		expect(budget.take(KEY).verdict).toBe('ok');
		now = 14_999;
		expect(budget.take(KEY).verdict).toBe('too_soon');
		expect(budget.take('another-key-1234').verdict).toBe('ok');
		now = 15_000;
		expect(budget.take(KEY).verdict).toBe('ok');
		now = 40_000;
		expect(budget.take(KEY).verdict).toBe('exhausted');
	});

	it('gives an attempt back when the API did not judge it, keeping the interval', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 1, windowMs: 600_000, minIntervalMs: 15_000, now: () => now });

		const first = budget.take(KEY);
		expect(first.verdict).toBe('ok');
		first.giveBack();
		first.giveBack();
		expect(budget.take(KEY).verdict).toBe('too_soon');
		now = 15_000;
		expect(budget.take(KEY).verdict).toBe('ok');
		now = 30_000;
		const refused = budget.take(KEY);
		expect(refused.verdict).toBe('exhausted');
		refused.giveBack();
		expect(budget.take(KEY).verdict).toBe('exhausted');
	});

	it('gives an attempt back only to the entry that counted it, never to one that replaced it since', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 1, windowMs: 1_000, maxEntries: 1, now: () => now });

		const old = budget.take(KEY);
		// Another key takes the only place, then the key comes back as a new entry and uses its attempt.
		now = 100;
		budget.take('another-key-1234');
		expect(budget.take(KEY).verdict).toBe('ok');

		old.giveBack();

		expect(budget.take(KEY).verdict).toBe('exhausted');
	});

	it('stays bounded, dropping expired keys first and the oldest live one only when full', () => {
		let now = 0;
		const budget = new AttemptBudget({ limit: 1, windowMs: 1_000, maxEntries: 3, now: () => now });

		budget.take('a');
		now = 500;
		budget.take('b');
		budget.take('c');
		// Full of live keys: the oldest one makes room.
		expect(budget.take('d').verdict).toBe('ok');
		expect(budget.take('a').verdict).toBe('ok');
		// 'b', 'c', 'd' and 'a' all used their single attempt; 'b' went when 'a' came back.
		expect(budget.take('c').verdict).toBe('exhausted');
		expect(budget.take('d').verdict).toBe('exhausted');

		now = 5_000;
		expect(budget.take('c').verdict).toBe('ok');
	});

	it('follows the clock of the process when none is given', () => {
		const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
		try {
			const budget = new AttemptBudget({ limit: 5, windowMs: 60_000, minIntervalMs: 10_000 });
			expect(budget.take(KEY).verdict).toBe('ok');
			now.mockReturnValue(1_005_000);
			expect(budget.take(KEY).verdict).toBe('too_soon');
			now.mockReturnValue(1_010_000);
			expect(budget.take(KEY).verdict).toBe('ok');
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
