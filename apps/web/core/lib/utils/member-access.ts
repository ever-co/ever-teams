import qs from 'qs';
import { ERoleName } from '@/core/types/generics/enums/role';
import { isTenantAdminRole } from '@/core/lib/utils/roles';
import { dateOrNull } from '@/core/lib/utils/settings-team';
import type { TInactiveEmployee } from '@/core/types/schemas/organization/inactive-employee.schema';

/** Gauzy's `PUT /employee/:id`, which ends and resumes a member's work, asks for this permission. */
const EMPLOYEES_EDIT_PERMISSION = 'ORG_EMPLOYEES_EDIT';

/** Gauzy's `GET /employee/pagination`, the one list that still shows a member whose work ended, asks for this one. */
const EMPLOYEES_VIEW_PERMISSION = 'ORG_EMPLOYEES_VIEW';

/** Gauzy's `PUT /user/:id` changes the role of someone else only for a holder of this permission. */
const USERS_EDIT_PERMISSION = 'ORG_USERS_EDIT';

/** Gauzy gives the super admin role, and edits a super admin, only for a holder of this permission. */
const SUPER_ADMIN_EDIT_PERMISSION = 'SUPER_ADMIN_EDIT';

export interface WorkspaceRole {
	id: string;
	name: string;
}

export interface InactiveMember {
	employeeId: string;
	name: string;
	email: string;
	imageUrl: string | null;
	deactivatedAt: Date | null;
}

export function holdsMemberDeactivationPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(EMPLOYEES_EDIT_PERMISSION);
}

export function holdsInactiveMembersPermission(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(EMPLOYEES_VIEW_PERMISSION);
}

/** Whether the members list has a use for the workspace roles: to tell admins apart, or to assign a role. */
export function readsWorkspaceRoles(permissions: ReadonlyArray<string>): boolean {
	const editsEmployees = permissions.includes(EMPLOYEES_EDIT_PERMISSION);
	const editsUsers = permissions.includes(USERS_EDIT_PERMISSION);
	return editsEmployees || editsUsers;
}

export function workspaceRoleNameOf(
	roles: ReadonlyArray<WorkspaceRole>,
	roleId: string | null | undefined
): string | null {
	if (!roleId) {
		return null;
	}
	const role = roles.find((candidate) => candidate.id === roleId);
	if (!role) {
		return null;
	}
	return role.name;
}

/**
 * Whether Deactivate is offered on a member. Gauzy refuses nobody who holds ORG_EMPLOYEES_EDIT: it has no rule
 * against ending one's own work or the work of the last admin. So the action is left out for oneself and for every
 * workspace admin, and for a member whose workspace role cannot be read, who may be one.
 */
export function canDeactivateMember({
	permissions,
	isYou,
	hasEmployee,
	workspaceRoleName
}: Readonly<{
	permissions: ReadonlyArray<string>;
	isYou: boolean;
	hasEmployee: boolean;
	workspaceRoleName: string | null;
}>): boolean {
	const editsEmployees = holdsMemberDeactivationPermission(permissions);
	const isOtherMember = hasEmployee && !isYou;
	if (!editsEmployees) {
		return false;
	}
	if (!isOtherMember) {
		return false;
	}
	if (!workspaceRoleName) {
		return false;
	}
	return !isTenantAdminRole(workspaceRoleName);
}

const WORKSPACE_ROLE_ORDER: ReadonlyArray<string> = [
	ERoleName.SUPER_ADMIN,
	ERoleName.ADMIN,
	ERoleName.MANAGER,
	ERoleName.EMPLOYEE,
	ERoleName.DATA_ENTRY,
	ERoleName.VIEWER,
	ERoleName.CANDIDATE,
	ERoleName.INTERVIEWER
];

function workspaceRoleRankOf(role: WorkspaceRole): number {
	const rank = WORKSPACE_ROLE_ORDER.indexOf(role.name);
	const isNamedByTheWorkspace = rank === -1;
	if (isNamedByTheWorkspace) {
		return WORKSPACE_ROLE_ORDER.length;
	}
	return rank;
}

function compareWorkspaceRoles(left: WorkspaceRole, right: WorkspaceRole): number {
	const rankGap = workspaceRoleRankOf(left) - workspaceRoleRankOf(right);
	if (rankGap !== 0) {
		return rankGap;
	}
	return left.name.localeCompare(right.name);
}

function isRoleWithinReach(role: WorkspaceRole, givesSuperAdmin: boolean): boolean {
	if (role.name === ERoleName.SUPER_ADMIN) {
		return givesSuperAdmin;
	}
	return true;
}

/**
 * The workspace roles the viewer may give to someone else, in the order of the role menu.
 *
 * Gauzy's `PUT /user/:id` keeps one line only: the super admin role needs SUPER_ADMIN_EDIT. Any other role is
 * accepted from every holder of ORG_USERS_EDIT. That equals "never a role higher than one's own" for a super admin
 * and for an admin, so the list is offered to those two roles and to nobody else.
 */
export function assignableWorkspaceRolesOf({
	viewerRoleName,
	permissions,
	roles
}: Readonly<{
	viewerRoleName: string | null | undefined;
	permissions: ReadonlyArray<string>;
	roles: ReadonlyArray<WorkspaceRole>;
}>): WorkspaceRole[] {
	const isAdminViewer = isTenantAdminRole(viewerRoleName);
	const editsUsers = permissions.includes(USERS_EDIT_PERMISSION);
	const assignsRoles = isAdminViewer && editsUsers;
	if (!assignsRoles) {
		return [];
	}
	const givesSuperAdmin = permissions.includes(SUPER_ADMIN_EDIT_PERMISSION);
	const withinReach = roles.filter((role) => isRoleWithinReach(role, givesSuperAdmin));
	return withinReach.sort(compareWorkspaceRoles);
}

/**
 * Whether the workspace role of a member can be changed by the viewer. Gauzy refuses a change of one's own role and,
 * without SUPER_ADMIN_EDIT, any edit of a super admin: a member whose role cannot be read may be one.
 */
export function canChangeWorkspaceRole({
	permissions,
	isYou,
	hasUser,
	workspaceRoleName,
	assignableRoles
}: Readonly<{
	permissions: ReadonlyArray<string>;
	isYou: boolean;
	hasUser: boolean;
	workspaceRoleName: string | null;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
}>): boolean {
	const hasRolesToGive = assignableRoles.length > 0;
	const isOtherAccount = hasUser && !isYou;
	if (!hasRolesToGive) {
		return false;
	}
	if (!isOtherAccount) {
		return false;
	}
	const editsSuperAdmins = permissions.includes(SUPER_ADMIN_EDIT_PERMISSION);
	if (editsSuperAdmins) {
		return true;
	}
	if (!workspaceRoleName) {
		return false;
	}
	return workspaceRoleName !== ERoleName.SUPER_ADMIN;
}

/** Gauzy answers at most this many employees a page (`take` of its pagination query). */
const INACTIVE_EMPLOYEES_PAGE_SIZE = 100;

export function inactiveEmployeePagesAfterFirst(total: number): number[] {
	const pageCount = Math.ceil(total / INACTIVE_EMPLOYEES_PAGE_SIZE);
	const pages: number[] = [];
	for (let page = 2; page <= pageCount; page += 1) {
		pages.push(page);
	}
	return pages;
}

/**
 * The query of Gauzy's `GET /employee/pagination` that lists the employees whose work ended: ending work sets
 * `isActive` off and `isArchived` on. Built in one place so both API modes ask Gauzy the same thing. `skip` is a
 * page number that starts at 1.
 */
export function inactiveEmployeesQueryOf({
	organizationId,
	tenantId,
	page
}: Readonly<{ organizationId: string; tenantId: string; page: number }>): string {
	return qs.stringify({
		where: { organizationId, tenantId, isActive: false, isArchived: true },
		relations: ['user', 'teams'],
		take: INACTIVE_EMPLOYEES_PAGE_SIZE,
		skip: page
	});
}

type InactiveEmployeeTeam = NonNullable<TInactiveEmployee['teams']>[number];

function membershipTeamIdOf(membership: InactiveEmployeeTeam): string | null {
	if (membership.organizationTeamId) {
		return membership.organizationTeamId;
	}
	const team = membership.organizationTeam;
	if (!team) {
		return null;
	}
	if (typeof team === 'string') {
		return team;
	}
	return team.id ?? null;
}

function belongsToTeam(employee: TInactiveEmployee, teamId: string): boolean {
	const memberships = employee.teams ?? [];
	return memberships.some((membership) => membershipTeamIdOf(membership) === teamId);
}

function joinedNameOf(firstName: string | null | undefined, lastName: string | null | undefined): string {
	const parts = [firstName, lastName].filter((part): part is string => Boolean(part?.trim()));
	return parts.join(' ').trim();
}

function inactiveEmployeeNameOf(employee: TInactiveEmployee): string {
	const user = employee.user;
	const candidates = [employee.fullName, user?.name, joinedNameOf(user?.firstName, user?.lastName)];
	const name = candidates.find((candidate) => Boolean(candidate?.trim()));
	if (name) {
		return name.trim();
	}
	return user?.email ?? '';
}

function inactiveMemberOf(employee: TInactiveEmployee): InactiveMember {
	return {
		employeeId: employee.id,
		name: inactiveEmployeeNameOf(employee),
		email: employee.user?.email ?? '',
		imageUrl: employee.user?.imageUrl || null,
		deactivatedAt: dateOrNull(employee.endWork)
	};
}

function compareInactiveMembers(left: InactiveMember, right: InactiveMember): number {
	const leftTime = left.deactivatedAt?.getTime() ?? 0;
	const rightTime = right.deactivatedAt?.getTime() ?? 0;
	if (leftTime !== rightTime) {
		return rightTime - leftTime;
	}
	return left.name.localeCompare(right.name);
}

/**
 * The deactivated members of one team, the latest first. Gauzy keeps the team memberships of a member whose work
 * ended, so the team is read on the employee. Only an employee with an end of work is kept: Restore clears that
 * date, and Gauzy brings nobody back from a date that is not there.
 */
export function inactiveMembersOfTeam(
	employees: ReadonlyArray<TInactiveEmployee>,
	teamId: string | null | undefined
): InactiveMember[] {
	if (!teamId) {
		return [];
	}
	const members: InactiveMember[] = [];
	for (const employee of employees) {
		const hasWorkEnded = Boolean(employee.endWork);
		const isOfTeam = belongsToTeam(employee, teamId);
		if (!hasWorkEnded) {
			continue;
		}
		if (!isOfTeam) {
			continue;
		}
		members.push(inactiveMemberOf(employee));
	}
	return members.sort(compareInactiveMembers);
}
