import qs from 'qs';
import type { TInactiveEmployee } from '@/core/types/schemas/organization/inactive-employee.schema';
import { errorReasonOf } from './error-feedback';
import {
	assignableWorkspaceRolesOf,
	canChangeWorkspaceRole,
	canDeactivateMember,
	holdsInactiveMembersPermission,
	holdsMemberDeactivationPermission,
	inactiveEmployeePagesAfterFirst,
	inactiveEmployeesQueryOf,
	inactiveMembersOfTeam,
	isWorkEndApplied,
	readsWorkspaceRoles,
	WorkEndNotAppliedError,
	workspaceRoleNameOf,
	type WorkspaceRole
} from './member-access';

const SUPER_ADMIN: WorkspaceRole = { id: 'role-super-admin', name: 'SUPER_ADMIN' };
const ADMIN: WorkspaceRole = { id: 'role-admin', name: 'ADMIN' };
const MANAGER: WorkspaceRole = { id: 'role-manager', name: 'MANAGER' };
const EMPLOYEE: WorkspaceRole = { id: 'role-employee', name: 'EMPLOYEE' };
const VIEWER: WorkspaceRole = { id: 'role-viewer', name: 'VIEWER' };
const SUPPORT: WorkspaceRole = { id: 'role-support', name: 'Support' };
const ACCOUNTING: WorkspaceRole = { id: 'role-accounting', name: 'Accounting' };

const WORKSPACE_ROLES: WorkspaceRole[] = [SUPPORT, VIEWER, EMPLOYEE, SUPER_ADMIN, ACCOUNTING, MANAGER, ADMIN];

const ADMIN_PERMISSIONS = ['ORG_EMPLOYEES_VIEW', 'ORG_EMPLOYEES_EDIT', 'ORG_USERS_EDIT'];
const SUPER_ADMIN_PERMISSIONS = [...ADMIN_PERMISSIONS, 'SUPER_ADMIN_EDIT'];
const TEAM_MANAGER_PERMISSIONS = ['ORG_TEAM_EDIT', 'ORG_TEAM_ADD', 'PROFILE_EDIT'];

describe('the permissions the members list reads', () => {
	it('takes ORG_EMPLOYEES_EDIT to deactivate or restore and ORG_EMPLOYEES_VIEW to list the inactive', () => {
		expect(holdsMemberDeactivationPermission(ADMIN_PERMISSIONS)).toBe(true);
		expect(holdsInactiveMembersPermission(ADMIN_PERMISSIONS)).toBe(true);
		expect(holdsMemberDeactivationPermission(['ORG_EMPLOYEES_VIEW'])).toBe(false);
		expect(holdsInactiveMembersPermission(['ORG_EMPLOYEES_EDIT'])).toBe(false);
	});

	it('gives a team manager neither of them', () => {
		expect(holdsMemberDeactivationPermission(TEAM_MANAGER_PERMISSIONS)).toBe(false);
		expect(holdsInactiveMembersPermission(TEAM_MANAGER_PERMISSIONS)).toBe(false);
		expect(readsWorkspaceRoles(TEAM_MANAGER_PERMISSIONS)).toBe(false);
	});

	it('reads the workspace roles for whoever may deactivate a member or change a role', () => {
		expect(readsWorkspaceRoles(['ORG_EMPLOYEES_EDIT'])).toBe(true);
		expect(readsWorkspaceRoles(['ORG_USERS_EDIT'])).toBe(true);
	});
});

describe('workspaceRoleNameOf', () => {
	it('names the role of an account, or nothing when the role is not among those read', () => {
		expect(workspaceRoleNameOf(WORKSPACE_ROLES, 'role-admin')).toBe('ADMIN');
		expect(workspaceRoleNameOf(WORKSPACE_ROLES, 'role-unknown')).toBeNull();
		expect(workspaceRoleNameOf(WORKSPACE_ROLES, null)).toBeNull();
		expect(workspaceRoleNameOf([], 'role-admin')).toBeNull();
	});
});

describe('canDeactivateMember', () => {
	const member = { permissions: ADMIN_PERMISSIONS, isYou: false, hasEmployee: true, workspaceRoleName: 'EMPLOYEE' };

	it('offers it to a holder of ORG_EMPLOYEES_EDIT on another member who is not an admin', () => {
		expect(canDeactivateMember(member)).toBe(true);
		expect(canDeactivateMember({ ...member, workspaceRoleName: 'MANAGER' })).toBe(true);
		expect(canDeactivateMember({ ...member, workspaceRoleName: 'Support' })).toBe(true);
	});

	it('never offers it without the permission the API route asks for', () => {
		expect(canDeactivateMember({ ...member, permissions: TEAM_MANAGER_PERMISSIONS })).toBe(false);
		expect(canDeactivateMember({ ...member, permissions: ['ORG_EMPLOYEES_VIEW', 'ORG_USERS_EDIT'] })).toBe(false);
	});

	it('never offers it on oneself or on a member without an employee record', () => {
		expect(canDeactivateMember({ ...member, isYou: true })).toBe(false);
		expect(canDeactivateMember({ ...member, hasEmployee: false })).toBe(false);
	});

	it('never offers it on a workspace admin, so the last admin cannot be deactivated from the list', () => {
		expect(canDeactivateMember({ ...member, workspaceRoleName: 'ADMIN' })).toBe(false);
		expect(canDeactivateMember({ ...member, workspaceRoleName: 'SUPER_ADMIN' })).toBe(false);
		expect(
			canDeactivateMember({ ...member, permissions: SUPER_ADMIN_PERMISSIONS, workspaceRoleName: 'ADMIN' })
		).toBe(false);
	});

	it('never offers it on a member whose workspace role cannot be read, who may be an admin', () => {
		expect(canDeactivateMember({ ...member, workspaceRoleName: null })).toBe(false);
	});
});

describe('assignableWorkspaceRolesOf', () => {
	it('gives an admin every role of the workspace except super admin, system roles first', () => {
		const roles = assignableWorkspaceRolesOf({
			viewerRoleName: 'ADMIN',
			permissions: ADMIN_PERMISSIONS,
			roles: WORKSPACE_ROLES
		});

		expect(roles).toEqual([ADMIN, MANAGER, EMPLOYEE, VIEWER, ACCOUNTING, SUPPORT]);
	});

	it('gives a super admin every role, super admin included', () => {
		const roles = assignableWorkspaceRolesOf({
			viewerRoleName: 'SUPER_ADMIN',
			permissions: SUPER_ADMIN_PERMISSIONS,
			roles: WORKSPACE_ROLES
		});

		expect(roles).toEqual([SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE, VIEWER, ACCOUNTING, SUPPORT]);
	});

	it('leaves super admin out for whoever does not hold SUPER_ADMIN_EDIT, a super admin too', () => {
		const roles = assignableWorkspaceRolesOf({
			viewerRoleName: 'SUPER_ADMIN',
			permissions: ADMIN_PERMISSIONS,
			roles: WORKSPACE_ROLES
		});

		expect(roles).not.toContain(SUPER_ADMIN);
	});

	it('offers nothing to an admin whose role lost ORG_USERS_EDIT', () => {
		const roles = assignableWorkspaceRolesOf({
			viewerRoleName: 'ADMIN',
			permissions: ['ORG_EMPLOYEES_EDIT'],
			roles: WORKSPACE_ROLES
		});

		expect(roles).toEqual([]);
	});

	it('offers nothing to a lower role, even one that was given ORG_USERS_EDIT', () => {
		for (const viewerRoleName of ['MANAGER', 'EMPLOYEE', 'VIEWER', 'Support', null, undefined]) {
			const roles = assignableWorkspaceRolesOf({
				viewerRoleName,
				permissions: SUPER_ADMIN_PERMISSIONS,
				roles: WORKSPACE_ROLES
			});

			expect(roles).toEqual([]);
		}
	});

	it('keeps the list it was given in its order', () => {
		const given = [...WORKSPACE_ROLES];

		assignableWorkspaceRolesOf({ viewerRoleName: 'ADMIN', permissions: ADMIN_PERMISSIONS, roles: given });

		expect(given).toEqual(WORKSPACE_ROLES);
	});
});

describe('canChangeWorkspaceRole', () => {
	const assignableRoles = [ADMIN, MANAGER, EMPLOYEE];
	const member = {
		permissions: ADMIN_PERMISSIONS,
		isYou: false,
		hasUser: true,
		workspaceRoleName: 'EMPLOYEE',
		assignableRoles
	};

	it('lets an admin change the role of another member, another admin included', () => {
		expect(canChangeWorkspaceRole(member)).toBe(true);
		expect(canChangeWorkspaceRole({ ...member, workspaceRoleName: 'ADMIN' })).toBe(true);
		expect(canChangeWorkspaceRole({ ...member, workspaceRoleName: 'Support' })).toBe(true);
	});

	it('never offers a change of one own role, which the API refuses', () => {
		expect(canChangeWorkspaceRole({ ...member, isYou: true })).toBe(false);
	});

	it('offers nothing without a role to give or without an account', () => {
		expect(canChangeWorkspaceRole({ ...member, assignableRoles: [] })).toBe(false);
		expect(canChangeWorkspaceRole({ ...member, hasUser: false })).toBe(false);
	});

	it('keeps an admin away from a super admin, and from a member whose role cannot be read', () => {
		expect(canChangeWorkspaceRole({ ...member, workspaceRoleName: 'SUPER_ADMIN' })).toBe(false);
		expect(canChangeWorkspaceRole({ ...member, workspaceRoleName: null })).toBe(false);
	});

	it('lets a holder of SUPER_ADMIN_EDIT change any other account', () => {
		const superAdmin = { ...member, permissions: SUPER_ADMIN_PERMISSIONS };

		expect(canChangeWorkspaceRole({ ...superAdmin, workspaceRoleName: 'SUPER_ADMIN' })).toBe(true);
		expect(canChangeWorkspaceRole({ ...superAdmin, workspaceRoleName: null })).toBe(true);
	});
});

describe('isWorkEndApplied', () => {
	const END_OF_WORK = '2026-11-12T10:00:00.000Z';

	it('reads a deactivation as done when Gauzy answers the employee inactive', () => {
		expect(isWorkEndApplied({ isActive: false }, END_OF_WORK)).toBe(true);
		expect(isWorkEndApplied({ isActive: true }, END_OF_WORK)).toBe(false);
	});

	it('reads a restoration as done when Gauzy answers the employee active', () => {
		expect(isWorkEndApplied({ isActive: true }, null)).toBe(true);
		expect(isWorkEndApplied({ isActive: false }, null)).toBe(false);
	});

	it('reads an answer without the flag as nothing changed', () => {
		expect(isWorkEndApplied({}, null)).toBe(false);
		expect(isWorkEndApplied({ isActive: null }, END_OF_WORK)).toBe(false);
	});

	it('reports a change Gauzy did not apply as the server not completing it', () => {
		expect(errorReasonOf(new WorkEndNotAppliedError())).toBe('server');
	});
});

describe('inactiveEmployeesQueryOf', () => {
	it('asks for the inactive and archived employees of one organization, with their account and teams', () => {
		const query = inactiveEmployeesQueryOf({ organizationId: 'organization-1', tenantId: 'tenant-1', page: 2 });

		expect(qs.parse(query)).toEqual({
			where: {
				organizationId: 'organization-1',
				tenantId: 'tenant-1',
				isActive: 'false',
				isArchived: 'true'
			},
			relations: ['user', 'teams'],
			take: '100',
			skip: '2'
		});
	});
});

describe('inactiveEmployeePagesAfterFirst', () => {
	it('names the pages left after the first one, a hundred employees a page', () => {
		expect(inactiveEmployeePagesAfterFirst(0)).toEqual([]);
		expect(inactiveEmployeePagesAfterFirst(100)).toEqual([]);
		expect(inactiveEmployeePagesAfterFirst(101)).toEqual([2]);
		expect(inactiveEmployeePagesAfterFirst(250)).toEqual([2, 3]);
	});
});

describe('inactiveMembersOfTeam', () => {
	const ana: TInactiveEmployee = {
		id: 'employee-ana',
		fullName: 'Ana Lima',
		endWork: '2026-10-02T09:00:00.000Z',
		user: { email: 'ana@example.com', imageUrl: 'https://example.com/ana.png' },
		teams: [{ organizationTeamId: 'team-a' }, { organizationTeamId: 'team-b' }]
	};
	const bo: TInactiveEmployee = {
		id: 'employee-bo',
		endWork: '2026-11-05T09:00:00.000Z',
		user: { firstName: 'Bo', lastName: 'Chen', email: 'bo@example.com', imageUrl: '' },
		teams: [{ organizationTeam: 'team-a' }]
	};
	const cy: TInactiveEmployee = {
		id: 'employee-cy',
		endWork: '2026-11-05T09:00:00.000Z',
		user: { email: 'cy@example.com' },
		teams: [{ organizationTeam: { id: 'team-a' } }]
	};

	it('keeps the members of the team, the latest deactivated first, then by name', () => {
		const members = inactiveMembersOfTeam([ana, cy, bo], 'team-a');

		expect(members.map((member) => member.employeeId)).toEqual(['employee-bo', 'employee-cy', 'employee-ana']);
	});

	it('reads the team from the id column or from the relation, as either ORM answers', () => {
		expect(inactiveMembersOfTeam([ana, bo, cy], 'team-b').map((member) => member.employeeId)).toEqual([
			'employee-ana'
		]);
		expect(inactiveMembersOfTeam([ana, bo, cy], 'team-c')).toEqual([]);
	});

	it('names a member from the employee, then the account, then the address', () => {
		const [first, second, third] = inactiveMembersOfTeam([ana, bo, cy], 'team-a');

		expect(first).toEqual({
			employeeId: 'employee-bo',
			name: 'Bo Chen',
			email: 'bo@example.com',
			imageUrl: null,
			deactivatedAt: new Date('2026-11-05T09:00:00.000Z')
		});
		expect(second.name).toBe('cy@example.com');
		expect(third.name).toBe('Ana Lima');
		expect(third.imageUrl).toBe('https://example.com/ana.png');
	});

	it('leaves out an inactive employee without an end of work, whom Restore could not bring back', () => {
		const withoutEnd: TInactiveEmployee = { ...ana, id: 'employee-dee', endWork: null };

		expect(inactiveMembersOfTeam([withoutEnd], 'team-a')).toEqual([]);
	});

	it('lists nobody for an employee without a team or while no team is active', () => {
		const withoutTeams: TInactiveEmployee = { ...ana, teams: null };

		expect(inactiveMembersOfTeam([withoutTeams], 'team-a')).toEqual([]);
		expect(inactiveMembersOfTeam([ana], null)).toEqual([]);
	});
});
