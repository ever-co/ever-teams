import { sidebarPagesOf, type SidebarGroup, type SidebarLink } from './sidebar-pages';

const HOME: SidebarLink[] = [
	{ title: 'Home', url: '/' },
	{ title: 'Calendar', url: '/calendar' }
];

const TASKS: SidebarGroup = {
	title: 'Tasks',
	url: '#',
	selectable: false,
	items: [
		{ title: "Team's tasks", url: '/team/tasks' },
		{ title: 'Kanban', url: '/kanban' }
	]
};

describe('sidebarPagesOf', () => {
	it('lists the first-level links, then the rows of each group under its name, in the order of the sidebar', () => {
		expect(sidebarPagesOf(HOME, [TASKS])).toEqual([
			{ title: 'Home', url: '/' },
			{ title: 'Calendar', url: '/calendar' },
			{ title: "Team's tasks", url: '/team/tasks', section: 'Tasks' },
			{ title: 'Kanban', url: '/kanban', section: 'Tasks' }
		]);
	});

	it('leaves out a group that only opens its rows, and keeps one that is a link itself', () => {
		const opensItsRows: SidebarGroup = {
			title: 'Projects',
			url: '/projects',
			selectable: false,
			items: [{ title: 'All projects', url: '/projects' }]
		};
		const plainLink: SidebarGroup = { title: 'Clients', url: '/clients', selectable: true };
		const linkWithRows: SidebarGroup = {
			title: 'Views',
			url: '/views',
			selectable: true,
			items: [{ title: 'Overdue', url: '/views/overdue' }]
		};

		expect(sidebarPagesOf([], [opensItsRows, plainLink, linkWithRows])).toEqual([
			{ title: 'All projects', url: '/projects', section: 'Projects' },
			{ title: 'Clients', url: '/clients' },
			{ title: 'Views', url: '/views' },
			{ title: 'Overdue', url: '/views/overdue', section: 'Views' }
		]);
	});

	it('keeps a group without rows as a page whatever it says about being selectable', () => {
		const withoutRows: SidebarGroup = { title: 'Invoices', url: '/invoices', selectable: false, items: [] };
		expect(sidebarPagesOf([], [withoutRows])).toEqual([{ title: 'Invoices', url: '/invoices' }]);
	});

	it('leaves out the rows that are not pages: a caption, a record with its own actions, a row that leads nowhere', () => {
		const favorites: SidebarGroup = {
			title: 'Favorites',
			url: '#',
			selectable: false,
			items: [
				{ title: 'Projects', url: '#', component: 'a caption' },
				{ title: 'Website', url: '/projects/p-1', actions: 'a remove button' },
				{ title: 'Nothing yet', url: '#' },
				{ title: ' ', url: '/blank-title' },
				{ title: 'All favorites', url: '/favorites' }
			]
		};

		expect(sidebarPagesOf([], [favorites])).toEqual([
			{ title: 'All favorites', url: '/favorites', section: 'Favorites' }
		]);
	});

	it('leaves out a first-level entry that leads nowhere', () => {
		expect(
			sidebarPagesOf(
				[
					{ title: 'Soon', url: '#' },
					{ title: 'Docs', url: '/docs' }
				],
				[]
			)
		).toEqual([{ title: 'Docs', url: '/docs' }]);
	});
});
