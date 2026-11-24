import { newTaskStatusNameOf, openStatusOfNewTask } from './new-task-status-name';

const STATUSES = [
	{ id: 'status-backlog', name: 'backlog' },
	{ id: 'status-open', name: 'open' },
	{ id: 'status-done', name: 'done' }
];

/**
 * A task created from the timer bar with no status picked (#5682) was saved as "backlog" by name and "open" by record:
 * the list showed Backlog and the Kanban board put it in the Open lane.
 */
describe('the status name of a new task', () => {
	it('is the name of the record the task is created with when none was picked', () => {
		expect(newTaskStatusNameOf(undefined, 'status-open', STATUSES)).toBe('open');
	});

	it('is the name of that record for a null name too', () => {
		expect(newTaskStatusNameOf(null, 'status-done', STATUSES)).toBe('done');
	});

	it('keeps a picked name as picked', () => {
		expect(newTaskStatusNameOf('done', 'status-open', STATUSES)).toBe('done');
	});

	it('stays the first status of the list when the record is not in it, as before', () => {
		expect(newTaskStatusNameOf(undefined, 'status-of-another-team', STATUSES)).toBe('backlog');
	});

	it('stays the first status of the list for a record without a name', () => {
		const statuses = [{ id: 'status-backlog', name: 'backlog' }, { id: 'status-unnamed' }];

		expect(newTaskStatusNameOf(undefined, 'status-unnamed', statuses)).toBe('backlog');
	});

	it('is undefined while the list is empty', () => {
		expect(newTaskStatusNameOf(undefined, 'status-open', [])).toBeUndefined();
	});
});

describe('the open status of a new task', () => {
	const OF_THE_PLATFORM = { id: 'open-platform', value: 'open', organizationTeamId: null };
	const OF_THE_TEAM = { id: 'open-team', value: 'open', organizationTeamId: 'team-1' };
	const BACKLOG = { id: 'backlog-team', value: 'backlog', organizationTeamId: 'team-1' };

	it("is the team's own when the list holds the platform's row too", () => {
		expect(openStatusOfNewTask([OF_THE_PLATFORM, BACKLOG, OF_THE_TEAM])).toBe(OF_THE_TEAM);
	});

	it("is the platform's row for a team without statuses of its own, as before", () => {
		expect(openStatusOfNewTask([OF_THE_PLATFORM, { id: 'done', value: 'done' }])).toBe(OF_THE_PLATFORM);
	});

	it("is the first open status when several are the team's", () => {
		const second = { id: 'open-team-2', value: 'open', organizationTeamId: 'team-1' };

		expect(openStatusOfNewTask([OF_THE_TEAM, second])).toBe(OF_THE_TEAM);
	});

	it('is undefined for a list without an open status', () => {
		expect(openStatusOfNewTask([BACKLOG])).toBeUndefined();
	});
});
