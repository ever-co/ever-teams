import {
	PALETTE_RECENT_MAX,
	readPaletteRecent,
	rememberPaletteRecent,
	type PaletteRecentStorage
} from './palette-recent';
import type { PaletteItem } from './palette-items';

function memoryStorage(initial: Record<string, string> = {}): PaletteRecentStorage & { data: Record<string, string> } {
	const data = { ...initial };
	return {
		data,
		getItem: (key) => data[key] ?? null,
		setItem: (key, value) => {
			data[key] = value;
		}
	};
}

const task = (id: string, title = `Task ${id}`): PaletteItem => ({ kind: 'task', id, title, href: `/task/${id}` });

describe('the palette recent entries', () => {
	it('puts the last one opened first, once, per person', () => {
		const storage = memoryStorage();
		rememberPaletteRecent(storage, 'me', task('1'));
		rememberPaletteRecent(storage, 'me', { kind: 'person', id: 'u1', title: 'Ana', href: '/profile/u1?name=Ana' });
		const list = rememberPaletteRecent(storage, 'me', task('1', 'Task 1 renamed'));
		expect(list.map((item) => `${item.kind}:${item.id}:${item.title}`)).toEqual([
			'task:1:Task 1 renamed',
			'person:u1:Ana'
		]);
		expect(readPaletteRecent(storage, 'me')).toEqual(list);
		expect(readPaletteRecent(storage, 'someone-else')).toEqual([]);
	});

	it('keeps at most the limit', () => {
		const storage = memoryStorage();
		for (let at = 0; at < PALETTE_RECENT_MAX + 3; at += 1) rememberPaletteRecent(storage, 'me', task(String(at)));
		const list = readPaletteRecent(storage, 'me');
		expect(list).toHaveLength(PALETTE_RECENT_MAX);
		expect(list[0].id).toBe(String(PALETTE_RECENT_MAX + 2));
	});

	it('skips what it cannot trust: malformed entries, another site, a broken value', () => {
		const storage = memoryStorage({
			'palette:recent:me': JSON.stringify([
				task('ok'),
				{ kind: 'task', id: 'x', title: 'Elsewhere', href: 'https://example.com' },
				{ kind: 'task', id: 'y', title: 'Protocol relative', href: '//example.com/task' },
				{ kind: 'unknown', id: 'z', title: 'Z', href: '/z' },
				{ kind: 'task', id: '', title: 'No id', href: '/task/' },
				'text'
			])
		});
		expect(readPaletteRecent(storage, 'me').map((item) => item.id)).toEqual(['ok']);
		expect(readPaletteRecent(memoryStorage({ 'palette:recent:me': '{oops' }), 'me')).toEqual([]);
		expect(readPaletteRecent(null, 'me')).toEqual([]);
	});

	it('never stores an entry leading outside the app, and survives a storage that refuses writes', () => {
		const storage = memoryStorage();
		expect(rememberPaletteRecent(storage, 'me', { ...task('1'), href: 'https://example.com' })).toEqual([]);
		expect(storage.data).toEqual({});
		const full: PaletteRecentStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error('QuotaExceededError');
			}
		};
		expect(rememberPaletteRecent(full, 'me', task('2')).map((item) => item.id)).toEqual(['2']);
		// The list this session holds goes on, even though the storage keeps nothing.
		const held = rememberPaletteRecent(full, 'me', task('2'));
		expect(rememberPaletteRecent(full, 'me', task('3'), held).map((item) => item.id)).toEqual(['3', '2']);
	});
});
