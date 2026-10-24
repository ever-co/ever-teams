import { MAX_TOKEN_COOKIE_CHUNKS, tokenCookieChunkCount } from './token-chunks';

describe('tokenCookieChunkCount', () => {
	it.each([
		['1', 1],
		['2', 2],
		[' 3 ', 3],
		[String(MAX_TOKEN_COOKIE_CHUNKS), MAX_TOKEN_COOKIE_CHUNKS]
	])('reads %p as %p chunks', (value, count) => {
		expect(tokenCookieChunkCount(value)).toBe(count);
	});

	it.each([
		['0'],
		[String(MAX_TOKEN_COOKIE_CHUNKS + 1)],
		['100000000'],
		['1e9'],
		['-1'],
		['1.5'],
		['0x10'],
		['abc'],
		[''],
		[undefined],
		[null],
		[7]
	])('reads %p as no chunk count', (value) => {
		expect(tokenCookieChunkCount(value)).toBeNull();
	});
});
