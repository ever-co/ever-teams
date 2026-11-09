import { readResponseShape } from './response-shape';

describe('readResponseShape', () => {
	it.each([
		['shape=lean', 'lean'],
		['shape=full', 'full'],
		['', undefined],
		['shape=', undefined],
		['shape=compact', undefined],
		['shape=LEAN', undefined]
	])('%s → %s', (query, expected) => {
		expect(readResponseShape(new URLSearchParams(query))).toBe(expected);
	});
});
