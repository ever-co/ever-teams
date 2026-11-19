import { menuEntryOf } from './menu-current';

describe("the menu's row of the screen on show", () => {
	it.each([
		['/timer', 'work'],
		['/', 'team'],
		['/profile/user-kofi', 'tasks'],
		['/settings/personal', 'settings'],
		['/settings/team/statuses', 'settings']
	])('tints %s as %s', (pathname, entry) => {
		expect(menuEntryOf(pathname)).toBe(entry);
	});

	it('tints no row on a task', () => {
		expect(menuEntryOf('/task/task-repaint')).toBeUndefined();
	});
});
