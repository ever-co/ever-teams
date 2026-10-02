/**
 * The one-time hand-off key is the only Ever ID value that ever goes into a URL; anything that does not have
 * its shape (an e-mail address, a token, a path) is ignored.
 */
import { EVER_ID_HANDOFF_PARAM, everIdHandoffPath, readEverIdHandoff } from './handoff';

const KEY = 'Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGx5';

describe('Ever ID hand-off key', () => {
	it('accepts a base64url key', () => {
		expect(readEverIdHandoff(KEY)).toBe(KEY);
	});

	it.each([
		['an e-mail address', 'person@example.test'],
		['a JWT', `${Buffer.from('{"alg":"none"}').toString('base64url')}.e30.unsigned`],
		['a path', '../../auth/passcode'],
		['too short', 'abc'],
		['too long', 'a'.repeat(129)],
		['empty', ''],
		['missing', null]
	])('ignores %s', (_label, value) => {
		expect(readEverIdHandoff(value)).toBeNull();
	});

	it('builds a same-origin path that carries the key and nothing else', () => {
		const path = everIdHandoffPath('/auth/passcode', KEY);

		expect(path).toBe(`/auth/passcode?${EVER_ID_HANDOFF_PARAM}=${KEY}`);
		expect(path).not.toMatch(/@|%40|email=|token=/i);
		expect(new URL(path, 'https://app.example.test').searchParams.get(EVER_ID_HANDOFF_PARAM)).toBe(KEY);
	});
});
