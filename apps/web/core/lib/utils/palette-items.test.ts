import {
	conversationItemsOf,
	matchingItems,
	pageItemsOf,
	paletteValueOf,
	personItemsOf,
	projectItemsOf,
	PALETTE_RESULTS_LIMIT,
	type PaletteItem
} from './palette-items';

const member = (userId: string | null, fullName: string | null) => ({
	employeeId: `employee-${userId}`,
	employee: { id: `employee-${userId}`, userId, fullName, user: { id: userId, name: null, imageUrl: null } }
});

describe('the palette entries', () => {
	it('lists the people of the team by name, each leading to their profile by user id', () => {
		const items = personItemsOf([
			member('user-2', 'Zoé Martin'),
			member('user-1', 'Ana Silva'),
			member(null, 'No User'),
			member('user-3', '  '),
			member('user-1', 'Ana Silva')
		]);
		expect(items.map((item) => item.title)).toEqual(['Ana Silva', 'Zoé Martin']);
		expect(items[1].href).toBe('/profile/user-2?name=Zo%C3%A9%20Martin');
		expect(items[0].kind).toBe('person');
	});

	it('falls back to the user name of a member without a full name', () => {
		const [item] = personItemsOf([
			{
				employee: {
					userId: 'user-9',
					fullName: null,
					user: { id: 'user-9', name: 'Sam', imageUrl: 'https://example.com/sam.png' }
				}
			}
		]);
		expect(item).toMatchObject({ title: 'Sam', imageUrl: 'https://example.com/sam.png' });
		expect(personItemsOf(null)).toEqual([]);
	});

	it('leaves archived projects out and leads to the project page', () => {
		const items = projectItemsOf([
			{ id: 'p2', name: 'Website' },
			{ id: 'p1', name: 'App', imageUrl: null },
			{ id: 'p3', name: 'Old', isArchived: true },
			{ id: 'p4', name: 'Older', archivedAt: '2026-01-01' },
			{ id: 'p5', name: '' }
		]);
		expect(items.map((item) => [item.title, item.href])).toEqual([
			['App', '/projects/p1'],
			['Website', '/projects/p2']
		]);
	});

	it('keeps the platform order of the pages, names an untitled one and leaves the trash out', () => {
		const items = pageItemsOf(
			[
				{ id: 'b', name: 'Roadmap', icon: '🗺️' },
				{ id: 'a', name: '' },
				{ id: 'c', name: 'Gone', isArchived: true }
			],
			'Untitled'
		);
		expect(items.map((item) => [item.title, item.href, item.icon])).toEqual([
			['Roadmap', '/docs/b', '🗺️'],
			['Untitled', '/docs/a', null]
		]);
	});

	it('names conversations as the chat does, leaving archived and nameless ones out', () => {
		const names: Record<string, string> = { c1: '#general', c2: 'Ana, Sam', c3: '', c4: '#old' };
		const items = conversationItemsOf(
			[{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4', archivedAt: '2026-01-01' }],
			(conversation) => names[conversation.id]
		);
		expect(items.map((item) => [item.title, item.href])).toEqual([
			['#general', '/chat/c1'],
			['Ana, Sam', '/chat/c2']
		]);
	});
});

describe('matching the palette entries', () => {
	const item = (title: string, id = title): PaletteItem => ({ kind: 'project', id, title, href: `/projects/${id}` });

	it('finds the titles with every word of the search, the ones starting with it first', () => {
		const items = [item('Mobile app'), item('App store'), item('Website'), item('The app for mobile')];
		expect(matchingItems(items, 'app').map((entry) => entry.title)).toEqual([
			'App store',
			'Mobile app',
			'The app for mobile'
		]);
		expect(matchingItems(items, 'MOBILE app').map((entry) => entry.title)).toEqual([
			'Mobile app',
			'The app for mobile'
		]);
	});

	it('finds nothing for an empty search, and at most the limit', () => {
		const many = Array.from({ length: 20 }, (_, at) => item(`Project ${at}`));
		expect(matchingItems(many, '   ')).toEqual([]);
		expect(matchingItems(many, 'project')).toHaveLength(PALETTE_RESULTS_LIMIT);
		expect(matchingItems(many, 'project', 3)).toHaveLength(3);
	});

	it('gives every entry a value of its own, found by its title', () => {
		const first = paletteValueOf({ kind: 'person', id: 'u1', title: 'Ana' });
		const second = paletteValueOf({ kind: 'person', id: 'u2', title: 'Ana' });
		expect(first).not.toBe(second);
		expect(first.startsWith('Ana')).toBe(true);
	});
});
