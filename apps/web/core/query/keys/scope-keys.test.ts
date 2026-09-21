import { queryKeys } from './index';

describe('scoped query keys', () => {
	it('keeps tenant, organization, team and user boundaries explicit', () => {
		expect(queryKeys.organizationTeams.listByScope('tenant-1', 'org-1', 'user-1')).toEqual([
			'organization-teams',
			'list-scope',
			'tenant-1',
			'org-1',
			'user-1'
		]);
		expect(queryKeys.organizationTeams.detailByScope('tenant-1', 'org-1', 'team-1', 'user-1')).toEqual([
			'organization-teams',
			'detail-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'user-1'
		]);
		expect(queryKeys.tasks.byTeamByScope('tenant-1', 'org-1', 'team-1', 'project-1')).toEqual([
			'tasks',
			'by-team-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'project-1'
		]);
		expect(queryKeys.dailyPlans.myPlansByScope('tenant-1', 'org-1', 'team-1', 'user-1')).toEqual([
			'daily-plans',
			'my-plans-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'user-1'
		]);
		expect(queryKeys.timer.byScope('tenant-1', 'org-1', 'team-1', 'user-1')).toEqual([
			'timer',
			'state-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'user-1'
		]);
		expect(queryKeys.tasks.statisticsByScope('tenant-1', 'org-1', 'team-1', 'task-1', 'employee-1')).toEqual([
			'tasks',
			'statistics-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'task-1',
			'employee-1'
		]);
		expect(queryKeys.workspaces.currentOrganizationByScope('tenant-1', 'org-1')).toEqual([
			'workspaces',
			'current-organization-scope',
			'tenant-1',
			'org-1'
		]);
		expect(queryKeys.users.employees.workingByScope('tenant-1', 'org-1', null)).toEqual([
			'users',
			'employees',
			'working-scope',
			'tenant-1',
			'org-1',
			null
		]);
		expect(queryKeys.users.invitations.myByUser('tenant-1', 'user-1')).toEqual([
			'users',
			'invitations',
			'my-user',
			'tenant-1',
			'user-1'
		]);
		expect(queryKeys.roles.byTenant('tenant-1')).toEqual(['roles', 'tenant', 'tenant-1']);
		expect(queryKeys.dailyPlans.allPlansByScope('tenant-1', 'org-1', 'team-1')).toEqual([
			'daily-plans',
			'all-plans-scope',
			'tenant-1',
			'org-1',
			'team-1'
		]);
		expect(queryKeys.dailyPlans.byTaskByScope('tenant-1', 'org-1', 'team-1', 'task-1')).toEqual([
			'daily-plans',
			'by-task-scope',
			'tenant-1',
			'org-1',
			'team-1',
			'task-1'
		]);
		expect(queryKeys.organizationProjects.byScope('tenant-1', 'org-1')).toEqual([
			'organization-projects',
			'by-scope',
			'tenant-1',
			'org-1'
		]);
		expect(queryKeys.organizationProjects.paginationByScope('tenant-1', 'org-1', { skip: 0, take: 20 })).toEqual([
			'organization-projects',
			'pagination-scope',
			'tenant-1',
			'org-1',
			{ skip: 0, take: 20 }
		]);
		expect(queryKeys.languages.byScope('tenant-1', 'user-1', false)).toEqual([
			'languages',
			'scope',
			'tenant-1',
			'user-1',
			false
		]);
		expect(queryKeys.currencies.byScope('tenant-1', 'org-1')).toEqual(['currencies', 'scope', 'tenant-1', 'org-1']);
	});

	it('uses null placeholders instead of collapsing incomplete scopes', () => {
		expect(queryKeys.organizationTeams.detailByScope(null, null, null, null)).toEqual([
			'organization-teams',
			'detail-scope',
			null,
			null,
			null,
			null
		]);
		expect(queryKeys.tasks.byTeamByScope(null, null, null, null)).toEqual([
			'tasks',
			'by-team-scope',
			null,
			null,
			null,
			null
		]);
		expect(queryKeys.dailyPlans.allPlansByScope(null, null, null)).toEqual([
			'daily-plans',
			'all-plans-scope',
			null,
			null,
			null
		]);
		expect(queryKeys.languages.byScope(null, null, true)).toEqual(['languages', 'scope', null, null, true]);
	});
});
