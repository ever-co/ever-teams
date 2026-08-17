import { randomBytes } from 'crypto';

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Largest multiple of CHARS.length that fits in a byte — bytes at or above it are rejected so
// every character stays equally likely (unbiased rejection sampling).
const LIMIT = 256 - (256 % CHARS.length);

/**
 * Cryptographically random token of `length` characters from [a-zA-Z0-9].
 *
 * 🛑 The previous implementation drew `length` random bytes ONCE and re-checked the SAME byte on
 * every rejected iteration — a rejected byte (value ≥ 248, p = 8/256 per byte) never changed, so
 * the loop never terminated. With length 8 that is a ~22 % chance PER CALL of spinning the
 * Node event loop forever at 100 % CPU. Every caller is on the auth path (register, accept
 * invite, magic-code first login, social login), so roughly one signup in five silently pinned
 * a web pod until it was killed. Live from 2025-05-05 (851e713) to 2026-08-17. Rejected bytes
 * must be REPLACED with fresh randomness — never re-read.
 */
export function generateToken(length: number): string {
	if (!Number.isInteger(length) || length < 0) {
		throw new RangeError(`generateToken: length must be a non-negative integer, got ${length}`);
	}
	let token = '';
	while (token.length < length) {
		// Over-draw a little so most calls finish in one round; leftovers are simply discarded.
		const bytes = randomBytes(length - token.length + 8);
		for (let i = 0; i < bytes.length && token.length < length; i++) {
			const value = bytes[i];
			if (value < LIMIT) {
				token += CHARS[value % CHARS.length];
			}
		}
	}
	return token;
}
