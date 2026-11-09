import {
	DOCS_RECENT_MAX,
	forgetRecent,
	lastVisited,
	readExpanded,
	readRecent,
	rememberRecent,
	writeExpanded,
	type KeyValueStorage
} from './docs-recent';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
	const data = { ...initial };
	return {
		data,
		getItem: (key) => data[key] ?? null,
		setItem: (key, value) => {
			data[key] = value;
		}
	};
}

describe('recent pages', () => {
	it('keeps the newest first, without duplicates, up to the limit', () => {
		const storage = memoryStorage();
		rememberRecent(storage, 'org', 'a');
		rememberRecent(storage, 'org', 'b');
		rememberRecent(storage, 'org', 'a');
		expect(readRecent(storage, 'org')).toEqual(['a', 'b']);
		for (let at = 0; at < DOCS_RECENT_MAX + 3; at += 1) rememberRecent(storage, 'org', `p${at}`);
		expect(readRecent(storage, 'org')).toHaveLength(DOCS_RECENT_MAX);
		expect(readRecent(storage, 'org')[0]).toBe(`p${DOCS_RECENT_MAX + 2}`);
	});

	it('is kept per organization and survives garbage', () => {
		const storage = memoryStorage({ 'docs:recent:other': '{not json', 'docs:recent:nums': '[1, "x", null]' });
		rememberRecent(storage, 'org', 'a');
		expect(readRecent(storage, 'other')).toEqual([]);
		expect(readRecent(storage, 'nums')).toEqual(['x']);
		expect(readRecent(storage, 'org')).toEqual(['a']);
	});

	it('forgets a page and answers the last visited that still exists', () => {
		const storage = memoryStorage();
		rememberRecent(storage, 'org', 'a');
		rememberRecent(storage, 'org', 'b');
		expect(lastVisited(storage, 'org', new Set(['a', 'b']))).toBe('b');
		expect(lastVisited(storage, 'org', new Set(['a']))).toBe('a');
		forgetRecent(storage, 'org', 'b');
		expect(readRecent(storage, 'org')).toEqual(['a']);
		expect(lastVisited(storage, 'org', new Set())).toBeNull();
	});

	it('does nothing without a storage', () => {
		expect(rememberRecent(null, 'org', 'a')).toEqual(['a']);
		expect(readRecent(null, 'org')).toEqual([]);
		expect(lastVisited(null, 'org', new Set(['a']))).toBeNull();
	});
});

describe('expanded nodes', () => {
	it('round-trips a set per organization', () => {
		const storage = memoryStorage();
		writeExpanded(storage, 'org', new Set(['a', 'b']));
		expect([...readExpanded(storage, 'org')].sort()).toEqual(['a', 'b']);
		expect(readExpanded(storage, 'other').size).toBe(0);
	});
});
