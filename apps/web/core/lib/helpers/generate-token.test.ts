/**
 * generateToken — the auth-path password generator.
 *
 * Regression for the 2025-05-05 → 2026-08-17 infinite loop: rejected random bytes were re-read
 * instead of re-drawn, so ~22 % of `generateToken(8)` calls never returned and pinned the
 * server. These tests drive `crypto.getRandomValues` deterministically to prove rejected bytes are replaced.
 */
import { generateToken } from './generate-token';

const CHARSET = /^[a-zA-Z0-9]*$/;

describe('generateToken', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('returns exactly `length` chars from [a-zA-Z0-9]', () => {
		for (const len of [0, 1, 8, 32, 128]) {
			const t = generateToken(len);
			expect(t).toHaveLength(len);
			expect(t).toMatch(CHARSET);
		}
	});

	it('terminates when every byte of the first draw must be rejected (the old infinite loop)', () => {
		// First draw: all 0xFF (≥ 248 → rejected). Old code re-read these forever.
		// Subsequent draws: 0x00 (→ 'a').
		const getRandomValues = jest
			.spyOn(globalThis.crypto, 'getRandomValues')
			.mockImplementationOnce((array) => (array as Uint8Array).fill(0xff))
			.mockImplementation((array) => (array as Uint8Array).fill(0x00));

		const t = generateToken(8);

		expect(t).toBe('aaaaaaaa');
		expect(getRandomValues.mock.calls.length).toBeGreaterThanOrEqual(2); // it re-drew instead of spinning
	});

	it('rejects bytes ≥ 248 and keeps the ones below (unbiased sampling)', () => {
		// 248..255 must be skipped; 0 → 'a', 61 → '9', 62 → 'a' (62 % 62 = 0), 247 → '9' (247 % 62 = 61).
		jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
			const b = array as Uint8Array;
			b.set([255, 248, 0, 61, 62, 247, 254, 1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, b.length));
			return b;
		});

		expect(generateToken(4)).toBe('a9a9');
	});

	it('is not deterministic across calls', () => {
		const seen = new Set(Array.from({ length: 20 }, () => generateToken(8)));
		expect(seen.size).toBe(20);
	});

	it('rejects a non-integer or negative length', () => {
		expect(() => generateToken(-1)).toThrow(RangeError);
		expect(() => generateToken(1.5)).toThrow(RangeError);
	});
});
