import type { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';

export type TeamRole = 'manager' | 'member';

/** The ids Gauzy's team update reads: employee ids, never the ids of the team-employee rows. */
export interface TeamRoster {
	memberIds: string[];
	managerIds: string[];
}

interface MemberEmployee {
	id?: string | null;
	userId?: string | null;
	fullName?: string | null;
	createdAt?: Date | string | null;
	organizationId?: string | null;
	tenantId?: string | null;
	isActive?: boolean | null;
	isTrackingEnabled?: boolean | null;
	user?: {
		id?: string | null;
		name?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		email?: string | null;
		imageUrl?: string | null;
	} | null;
}

/** The schema types `employee` loosely; every reader goes through this shape. */
export function memberEmployeeOf(member: TOrganizationTeamEmployee): MemberEmployee | null {
	const employee: MemberEmployee | null | undefined = member.employee;
	if (!employee) {
		return null;
	}
	return employee;
}

export function employeeIdOf(member: TOrganizationTeamEmployee): string | null {
	if (member.employeeId) {
		return member.employeeId;
	}
	const employeeId = memberEmployeeOf(member)?.id;
	if (employeeId) {
		return employeeId;
	}
	return null;
}

export function memberUserIdOf(member: TOrganizationTeamEmployee): string | null {
	const employee = memberEmployeeOf(member);
	const userId = employee?.userId ?? employee?.user?.id;
	if (userId) {
		return userId;
	}
	return null;
}

function joinedName(firstName: string | null | undefined, lastName: string | null | undefined): string {
	const parts = [firstName, lastName].filter((part): part is string => Boolean(part?.trim()));
	return parts.join(' ').trim();
}

export function memberEmailOf(member: TOrganizationTeamEmployee): string {
	const email = memberEmployeeOf(member)?.user?.email;
	return email ?? '';
}

export function memberNameOf(member: TOrganizationTeamEmployee): string {
	const employee = memberEmployeeOf(member);
	const user = employee?.user;
	const candidates = [employee?.fullName, user?.name, joinedName(user?.firstName, user?.lastName)];
	const name = candidates.find((candidate) => Boolean(candidate?.trim()));
	if (name) {
		return name.trim();
	}
	return memberEmailOf(member);
}

export function memberFirstNameOf(member: TOrganizationTeamEmployee): string {
	return memberEmployeeOf(member)?.user?.firstName ?? '';
}

export function memberLastNameOf(member: TOrganizationTeamEmployee): string {
	return memberEmployeeOf(member)?.user?.lastName ?? '';
}

export function memberImageUrlOf(member: TOrganizationTeamEmployee): string | null {
	const imageUrl = memberEmployeeOf(member)?.user?.imageUrl;
	if (!imageUrl) {
		return null;
	}
	return imageUrl;
}

export function dateOrNull(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	const isInvalid = Number.isNaN(date.getTime());
	if (isInvalid) {
		return null;
	}
	return date;
}

export function memberJoinedAtOf(member: TOrganizationTeamEmployee): Date | null {
	const rowDate = dateOrNull(member.createdAt);
	if (rowDate) {
		return rowDate;
	}
	return dateOrNull(memberEmployeeOf(member)?.createdAt);
}

export function matchesMemberSearch(member: TOrganizationTeamEmployee, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}
	const inName = memberNameOf(member).toLowerCase().includes(needle);
	const inEmail = memberEmailOf(member).toLowerCase().includes(needle);
	return inName || inEmail;
}

export function teamRosterOf(
	members: readonly TOrganizationTeamEmployee[],
	isManager: (member: TOrganizationTeamEmployee) => boolean
): TeamRoster {
	const memberIds = new Set<string>();
	const managerIds = new Set<string>();
	for (const member of members) {
		const employeeId = employeeIdOf(member);
		if (!employeeId) {
			continue;
		}
		memberIds.add(employeeId);
		if (isManager(member)) {
			managerIds.add(employeeId);
		}
	}
	return { memberIds: [...memberIds], managerIds: [...managerIds] };
}

export function rosterWithRole(roster: TeamRoster, employeeId: string, role: TeamRole): TeamRoster {
	const managerIds = roster.managerIds.filter((id) => id !== employeeId);
	if (role === 'manager') {
		managerIds.push(employeeId);
	}
	return { memberIds: roster.memberIds, managerIds };
}

export function rosterWithout(roster: TeamRoster, employeeId: string): TeamRoster {
	const memberIds = roster.memberIds.filter((id) => id !== employeeId);
	const managerIds = roster.managerIds.filter((id) => id !== employeeId);
	return { memberIds, managerIds };
}

export function teamsWithRenamedMember(
	teams: TOrganizationTeam[],
	teamId: string,
	memberRowId: string,
	firstName: string,
	lastName: string
): TOrganizationTeam[] {
	const fullName = joinedName(firstName, lastName);
	return teams.map((team) => {
		if (team.id !== teamId) {
			return team;
		}
		const members = (team.members ?? []).map((member) => {
			if (member.id !== memberRowId) {
				return member;
			}
			const employee = memberEmployeeOf(member);
			if (!employee) {
				return member;
			}
			const user = { ...employee.user, firstName, lastName, name: fullName };
			return { ...member, employee: { ...employee, fullName, user } };
		});
		return { ...team, members };
	});
}

export type TeamDangerBlock = 'notManager' | 'needsSecondManager' | 'otherManagers' | 'onlyManager' | 'notMember';

export interface TeamDangerRules {
	transfer: TeamDangerBlock | null;
	remove: TeamDangerBlock | null;
	quit: TeamDangerBlock | null;
}

interface TeamDangerFacts {
	isTeamManager: boolean;
	managerCount: number;
	isMember: boolean;
}

function transferBlockOf({ isTeamManager, managerCount }: TeamDangerFacts): TeamDangerBlock | null {
	if (!isTeamManager) {
		return 'notManager';
	}
	if (managerCount < 2) {
		return 'needsSecondManager';
	}
	return null;
}

function removeBlockOf({ isTeamManager, managerCount }: TeamDangerFacts): TeamDangerBlock | null {
	if (!isTeamManager) {
		return 'notManager';
	}
	if (managerCount > 1) {
		return 'otherManagers';
	}
	if (managerCount < 1) {
		return 'notManager';
	}
	return null;
}

function quitBlockOf({ isTeamManager, managerCount, isMember }: TeamDangerFacts): TeamDangerBlock | null {
	if (isTeamManager) {
		const hasOtherManagers = managerCount > 1;
		if (hasOtherManagers) {
			return null;
		}
		return 'onlyManager';
	}
	if (!isMember) {
		return 'notMember';
	}
	return null;
}

export function teamDangerRulesOf(facts: TeamDangerFacts): TeamDangerRules {
	return {
		transfer: transferBlockOf(facts),
		remove: removeBlockOf(facts),
		quit: quitBlockOf(facts)
	};
}

export function teamShareLinkOf(
	origin: string,
	locale: string | null | undefined,
	team: Pick<TOrganizationTeam, 'id' | 'profile_link'>
): string | null {
	if (!team.profile_link) {
		return null;
	}
	let localeSegment = '';
	if (locale) {
		localeSegment = `/${locale}`;
	}
	return `${origin}${localeSegment}/team/${team.id}/${team.profile_link}`;
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizedHexColor(value: string): string {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.startsWith('#')) {
		return trimmed;
	}
	return `#${trimmed}`;
}

export function isHexColor(value: string): boolean {
	return HEX_COLOR_PATTERN.test(value);
}

export function isSameColor(left: string | null | undefined, right: string | null | undefined): boolean {
	if (!left) {
		return false;
	}
	if (!right) {
		return false;
	}
	return left.toLowerCase() === right.toLowerCase();
}
