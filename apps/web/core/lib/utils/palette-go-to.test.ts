import { goToCommandIdOf, goToRowsOf, openablePageHandlers, paletteListedGroups } from './palette-go-to';
import type { SidebarPage } from './sidebar-pages';

const MEMBER_PAGES: SidebarPage[] = [
	{ title: 'Home', url: '/' },
	{ title: "Team's tasks", url: '/team/tasks', section: 'Tasks' },
	{ title: 'My tasks', url: '/profile/u-1?name=Ann', section: 'Tasks' },
	{ title: 'All projects', url: '/projects', section: 'Projects' },
	{ title: 'Archived', url: '/projects?archived=true', section: 'Projects' },
	{ title: 'Time & activity', url: '/reports/time-and-activity', section: 'My work' }
];

const MANAGER_PAGES: SidebarPage[] = [
	...MEMBER_PAGES,
	{ title: 'Timesheets', url: '/reports/timesheet/u-1?name=Ann', section: 'Reports' },
	{ title: 'Weekly limit', url: '/reports/weekly-limit', section: 'Reports' },
	{ title: 'Time & activity', url: '/reports/time-and-activity', section: 'Reports' }
];

describe('goToCommandIdOf', () => {
	it('names the registry command that leads to the same page', () => {
		expect(goToCommandIdOf('/')).toBe('goHome');
		expect(goToCommandIdOf('/team/tasks')).toBe('goTasks');
		expect(goToCommandIdOf('/views')).toBe('goViews');
		expect(goToCommandIdOf('/views/overdue')).toBe('goOverdue');
		expect(goToCommandIdOf('/reports/time-and-activity')).toBe('goTimeActivity');
	});

	it('finds the profile and the timesheet commands by the page under their path, whoever it is of', () => {
		expect(goToCommandIdOf('/profile/u-1?name=Ann')).toBe('goProfile');
		expect(goToCommandIdOf('/reports/timesheet/u-1?name=Ann')).toBe('goTimesheets');
		expect(goToCommandIdOf('/profile')).toBeUndefined();
	});

	it('names none for a page no command leads to, and none for a link that adds a query to a command page', () => {
		expect(goToCommandIdOf('/calendar')).toBeUndefined();
		expect(goToCommandIdOf('/projects')).toBe('goProjects');
		expect(goToCommandIdOf('/projects?archived=true')).toBeUndefined();
	});
});

describe('goToRowsOf', () => {
	it('reads a page under a group with the group first, and a first-level page by its name alone', () => {
		const rows = goToRowsOf(MEMBER_PAGES);
		expect(rows.map((row) => row.label)).toEqual([
			'Home',
			"Tasks › Team's tasks",
			'Tasks › My tasks',
			'Projects › All projects',
			'Projects › Archived',
			'My work › Time & activity'
		]);
	});

	it('lists once a page the sidebar links twice, under the group that comes first', () => {
		const labels = goToRowsOf(MANAGER_PAGES).map((row) => row.label);
		expect(labels).toContain('My work › Time & activity');
		expect(labels).not.toContain('Reports › Time & activity');
		expect(labels).toContain('Reports › Timesheets');
	});

	it('lists a name once, so no two rows of the palette read the same', () => {
		const rows = goToRowsOf([
			{ title: 'Sprint', url: '/views/v-1', section: 'Views' },
			{ title: 'Sprint', url: '/views/v-2', section: 'Views' }
		]);
		expect(rows).toEqual([{ label: 'Views › Sprint', url: '/views/v-1' }]);
	});

	it('ties each row to the command that leads to its page, and a command to one row only', () => {
		const rows = goToRowsOf([...MEMBER_PAGES, { title: 'Ann', url: '/profile/u-2?name=Bob', section: 'People' }]);
		const commandOf = (label: string) => rows.find((row) => row.label === label)?.commandId;
		expect(commandOf('Home')).toBe('goHome');
		expect(commandOf('Tasks › My tasks')).toBe('goProfile');
		expect(commandOf('People › Ann')).toBeUndefined();
		expect(commandOf('Projects › All projects')).toBe('goProjects');
		expect(commandOf('Projects › Archived')).toBeUndefined();
	});
});

describe('openablePageHandlers', () => {
	const handlers = {
		themeToggle: 'theme',
		goHome: 'home',
		goTimeActivity: 'time and activity',
		goTimesheets: 'timesheets',
		goWeeklyLimit: 'weekly limit'
	};

	it('keeps every handler while the sidebar has handed no list', () => {
		expect(openablePageHandlers(handlers, undefined)).toBe(handlers);
	});

	it('drops the "go to" handlers of the pages the sidebar does not list for a member, and nothing else', () => {
		expect(Object.keys(openablePageHandlers(handlers, MEMBER_PAGES))).toEqual([
			'themeToggle',
			'goHome',
			'goTimeActivity'
		]);
	});

	it('keeps them for a manager, whose sidebar lists the reports', () => {
		expect(openablePageHandlers(handlers, MANAGER_PAGES)).toEqual(handlers);
	});
});

describe('paletteListedGroups', () => {
	const suggestions = { id: 'suggestions', commands: [{ commandId: 'themeToggle', shortcutDisplay: 'TH' }] };
	const navigation = {
		id: 'navigation',
		commands: [
			{ commandId: 'goKanban', shortcutDisplay: '⌘K' },
			{ commandId: 'goTimesheets', shortcutDisplay: '⌘TS', shortcutKeys: ['G', 'S'] }
		]
	};
	const goTo = {
		id: 'goTo',
		commands: [
			{ commandId: 'goKanban', shortcutDisplay: '' },
			{ commandId: undefined, shortcutDisplay: '' },
			{ commandId: 'goMine', shortcutDisplay: '', shortcutKeys: ['G', 'M'] }
		]
	};

	it('leaves the groups as they are while the sidebar has handed no list', () => {
		expect(paletteListedGroups([suggestions, navigation, goTo], undefined)).toEqual([
			suggestions,
			navigation,
			goTo
		]);
	});

	it('lists no "navigation" group once the pages are rows of "Go to", and keeps the other groups', () => {
		const listed = paletteListedGroups([suggestions, navigation, goTo], MEMBER_PAGES);
		expect(listed.map((group) => group.id)).toEqual(['suggestions', 'goTo']);
		expect(listed[0]).toBe(suggestions);
	});

	it('gives a row the keys of the hard-coded link it takes the place of, and leaves the other rows their own', () => {
		const [, listedGoTo] = paletteListedGroups([suggestions, navigation, goTo], MEMBER_PAGES);
		expect(listedGoTo.commands).toEqual([
			{ commandId: 'goKanban', shortcutDisplay: '⌘K', shortcutKeys: undefined },
			{ commandId: undefined, shortcutDisplay: '' },
			{ commandId: 'goMine', shortcutDisplay: '', shortcutKeys: ['G', 'M'] }
		]);
	});
});
