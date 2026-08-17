/**
 * generateToken — the auth-path password generator.
 *
 * Regression for the 2025-05-05 → 2026-08-17 infinite loop: rejected random bytes were re-read
 * instead of re-drawn, so ~22 % of `generateToken(8)` calls never returned and pinned the
 * server. These tests drive `randomBytes` deterministically to prove rejected bytes are replaced.
 */
import { generateToken } from './generate-token';

// `import * as crypto` gives SWC's interop COPY of the module, so jest.spyOn on it never reaches
// generate-token.ts. Mock the module itself with a real-by-default, overridable randomBytes.
jest.mock('crypto', () => {
	const actual = jest.requireActual<typeof import('crypto')>('crypto');
	return { ...actual, randomBytes: jest.fn(actual.randomBytes) };
});
const randomBytesMock = jest.requireMock<typeof import('crypto')>('crypto').randomBytes as jest.Mock;
const actualRandomBytes = jest.requireActual<typeof import('crypto')>('crypto').randomBytes;

const CHARSET = /^[a-zA-Z0-9]*$/;

describe('generateToken', () => {
	afterEach(() => {
		randomBytesMock.mockReset();
		randomBytesMock.mockImplementation(actualRandomBytes);
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
		randomBytesMock
			.mockImplementationOnce((n: number) => Buffer.alloc(n, 0xff))
			.mockImplementation((n: number) => Buffer.alloc(n, 0x00));

		const t = generateToken(8);

		expect(t).toBe('aaaaaaaa');
		expect(randomBytesMock.mock.calls.length).toBeGreaterThanOrEqual(2); // it re-drew instead of spinning
	});

	it('rejects bytes ≥ 248 and keeps the ones below (unbiased sampling)', () => {
		// 248..255 must be skipped; 0 → 'a', 61 → '9', 62 → 'a' (62 % 62 = 0), 247 → '9' (247 % 62 = 61).
		randomBytesMock.mockImplementation((n: number) => {
			const b = Buffer.from([255, 248, 0, 61, 62, 247, 254, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
			return b.subarray(0, n);
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
