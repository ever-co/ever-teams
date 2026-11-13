import type { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	timeImportMembersOf,
	timeImportProjectsOf,
	timeImportRefusalOf,
	timeImportTasksOf
} from './time-import-access';

function teamMember(overrides: Record<string, unknown>): TOrganizationTeamEmployee {
	return overrides as TOrganizationTeamEmployee;
}

function teamOf(overrides: Record<string, unknown>): TOrganizationTeam {
	return overrides as TOrganizationTeam;
}

function taskOf(overrides: Record<string, unknown>): TTask {
	return overrides as TTask;
}

describe('timeImportRefusalOf', () => {
	it('lets a viewer import who may add manual time in an organization that allows it', () => {
		expect(timeImportRefusalOf(true, true)).toBeNull();
	});

	it('refuses a viewer whose role has no manual time permission', () => {
		expect(timeImportRefusalOf(true, false)).toBe('noPermission');
	});

	it('names the organization switch first, since no role gets past it', () => {
		expect(timeImportRefusalOf(false, true)).toBe('manualTimeOff');
		expect(timeImportRefusalOf(false, false)).toBe('manualTimeOff');
	});
});

describe('timeImportMembersOf', () => {
	it('reads the employee, never the row of the team member, with the email and the name', () => {
		const team = teamOf({
			members: [
				teamMember({
					id: 'team-member-row-1',
					employeeId: 'employee-ada',
					employee: { id: 'employee-ada', fullName: 'Ada Lovelace', user: { email: 'ada@ever.co' } }
				}),
				teamMember({
					id: 'team-member-row-2',
					employee: { id: 'employee-alan', user: { email: 'alan@ever.co', name: 'Alan Turing' } }
				})
			]
		});

		expect(timeImportMembersOf(team)).toEqual([
			{ employeeId: 'employee-ada', email: 'ada@ever.co', name: 'Ada Lovelace' },
			{ employeeId: 'employee-alan', email: 'alan@ever.co', name: 'Alan Turing' }
		]);
	});

	it('leaves out a member a file could not name: no email, or no employee', () => {
		const team = teamOf({
			members: [
				teamMember({ employeeId: 'employee-ada', employee: { id: 'employee-ada', user: { email: null } } }),
				teamMember({ id: 'team-member-row-2', employee: null })
			]
		});

		expect(timeImportMembersOf(team)).toEqual([]);
	});

	it('answers an empty list before the team is known', () => {
		expect(timeImportMembersOf(null)).toEqual([]);
		expect(timeImportMembersOf(teamOf({ members: null }))).toEqual([]);
	});
});

describe('timeImportProjectsOf', () => {
	it('keeps the projects of the team that have a name', () => {
		const team = teamOf({
			projects: [
				{ id: 'project-website', name: 'Website', budget: 10 },
				{ id: 'project-unnamed', name: '' }
			]
		});

		expect(timeImportProjectsOf(team)).toEqual([{ id: 'project-website', name: 'Website' }]);
	});

	it('answers an empty list for a team without projects', () => {
		expect(timeImportProjectsOf(teamOf({}))).toEqual([]);
	});
});

describe('timeImportTasksOf', () => {
	const tasks = [
		taskOf({
			id: 'task-fix-login',
			title: 'Fix login',
			projectId: 'project-website',
			teams: [{ id: 'team-a' }, { id: 'team-b' }],
			members: [{ id: 'employee-ada', userId: 'user-ada' }]
		}),
		taskOf({ id: 'task-other-team', title: 'Write docs', teams: [{ id: 'team-b' }], members: [] }),
		taskOf({ id: 'task-bare', title: 'Plan sprint', teams: [{ id: 'team-a' }] })
	];

	it('keeps the tasks of the team the time is saved with, with who they are assigned to', () => {
		expect(timeImportTasksOf(tasks, 'team-a')).toEqual([
			{
				id: 'task-fix-login',
				title: 'Fix login',
				projectId: 'project-website',
				assigneeEmployeeIds: ['employee-ada']
			},
			{ id: 'task-bare', title: 'Plan sprint', projectId: null, assigneeEmployeeIds: [] }
		]);
	});

	it('answers no task before the team is known', () => {
		expect(timeImportTasksOf(tasks, '')).toEqual([]);
		expect(timeImportTasksOf(tasks, null)).toEqual([]);
	});
});
