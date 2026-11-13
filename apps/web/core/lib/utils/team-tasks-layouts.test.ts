let mockIsTaskViewsEnabled = false;
jest.mock('./task-views-enabled', () => ({ isTaskViewsEnabled: () => mockIsTaskViewsEnabled }));

import { availableTeamTasksLayouts, shownTeamTasksLayout } from './team-tasks-layouts';
import type { TeamTasksLayout } from './team-tasks-view';

describe('the layouts a deployment offers', () => {
	beforeEach(() => {
		mockIsTaskViewsEnabled = false;
	});

	it('offers the list, the calendar and the table without the saved views', () => {
		expect(availableTeamTasksLayouts()).toEqual(['list', 'calendar', 'table']);
	});

	it('adds the board and the timeline with the saved views, in the order the switch shows them', () => {
		mockIsTaskViewsEnabled = true;
		expect(availableTeamTasksLayouts()).toEqual(['list', 'board', 'calendar', 'table', 'timeline']);
	});
});

describe('the layout the page draws', () => {
	beforeEach(() => {
		mockIsTaskViewsEnabled = false;
	});

	it('draws the calendar and the table of a view on every deployment', () => {
		expect(shownTeamTasksLayout({ layout: 'calendar' })).toBe('calendar');
		expect(shownTeamTasksLayout({ layout: 'table' })).toBe('table');
		expect(shownTeamTasksLayout({ layout: 'list' })).toBe('list');
	});

	it('draws a board and a timeline with the saved views, and the list in their place without them', () => {
		expect(shownTeamTasksLayout({ layout: 'board' })).toBe('list');
		expect(shownTeamTasksLayout({ layout: 'timeline' })).toBe('list');

		mockIsTaskViewsEnabled = true;
		expect(shownTeamTasksLayout({ layout: 'board' })).toBe('board');
		expect(shownTeamTasksLayout({ layout: 'timeline' })).toBe('timeline');
	});

	it('reads a view without a layout as the list, with or without the saved views', () => {
		expect(shownTeamTasksLayout({})).toBe('list');
		expect(shownTeamTasksLayout({ layout: undefined })).toBe('list');

		mockIsTaskViewsEnabled = true;
		expect(shownTeamTasksLayout({})).toBe('list');
	});

	it('draws the list for a layout no deployment offers', () => {
		mockIsTaskViewsEnabled = true;
		const unknownLayout = 'gantt' as unknown as TeamTasksLayout;
		expect(shownTeamTasksLayout({ layout: unknownLayout })).toBe('list');
	});
});
