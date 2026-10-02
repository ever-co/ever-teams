/**
 * Attempt budgets per one-time key: one browser repeating an Ever ID step cannot use up the API's limits that every
 * other person shares, because a key that used its budget is answered here without calling the API.
 */
import { AttemptBudget } from './attempts';

describe('AttemptBudget', () => {
	it('allows a key its budget within the window, then refuses it until the window ends', () => {
		let now = 1_000;
		const budget = new AttemptBudget(3, 60_000, 100, () => now);

		expect([budget.take('key-1'), budget.take('key-1'), budget.take('key-1')]).toEqual([true, true, true]);
		expect(budget.take('key-1')).toBe(false);
		expect(budget.take('key-2')).toBe(true);

		now += 60_000;
		expect(budget.take('key-1')).toBe(true);
	});

	it('stays bounded, dropping expired keys first and the oldest live one only when full', () => {
		let now = 0;
		const budget = new AttemptBudget(1, 1_000, 3, () => now);

		budget.take('a');
		now = 500;
		budget.take('b');
		budget.take('c');
		// Full of live keys: the oldest one makes room.
		expect(budget.take('d')).toBe(true);
		expect(budget.take('a')).toBe(true);
		// 'b', 'c', 'd' and 'a' all used their single attempt; 'b' went when 'a' came back.
		expect(budget.take('c')).toBe(false);
		expect(budget.take('d')).toBe(false);

		now = 5_000;
		expect(budget.take('c')).toBe(true);
	});

	it('keeps no key as such', () => {
		const budget = new AttemptBudget(1, 1_000);
		budget.take('k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA');

		expect(
			JSON.stringify([...(budget as unknown as { entries: Map<string, unknown> }).entries.keys()])
		).not.toContain('k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA');
	});
});
