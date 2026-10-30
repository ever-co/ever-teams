import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ID } from '@/core/types/interfaces/common/base-interfaces';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

/** A team membership, as the teams the app loads carry it. */
type TeamMembership = Pick<TOrganizationTeamEmployee, 'employeeId' | 'isManager' | 'isActive' | 'isArchived'>;

/** A team with the memberships the app loaded for it. */
type ReviewerTeam = { members?: readonly TeamMembership[] | null };

/** A time log, by the employee whose timesheet holds it. */
type ReviewedTimeLog = Pick<ITimeLog, 'employeeId'>;

/**
 * The user who changes a timesheet status: the permissions of their role, their own employee and the teams the app
 * loaded for them.
 */
export interface TimesheetReviewer {
	permissions: readonly string[];
	employeeId?: ID | null;
	teams: readonly ReviewerTeam[];
}

const ANY_TIMESHEET_STATUS: readonly ETimesheetStatus[] = Object.values(ETimesheetStatus);
const TEAM_MANAGER_STATUSES: readonly ETimesheetStatus[] = [ETimesheetStatus.APPROVED, ETimesheetStatus.DENIED];
const NO_TIMESHEET_STATUS: readonly ETimesheetStatus[] = [];

/** Whether the role lets the user give any timesheet any status, their own included. */
export function canApproveAnyTimesheet(permissions: readonly string[]): boolean {
	return permissions.includes('CAN_APPROVE_TIMESHEET');
}

/**
 * Whether the API runs its team manager check for a user without CAN_APPROVE_TIMESHEET. The status route lets a
 * team manager in through TIME_TRACKER, and the check reads no employee for a CHANGE_SELECTED_EMPLOYEE holder, so
 * it refuses them.
 */
function reachesTeamManagerCheck(permissions: readonly string[]): boolean {
	const reachesStatusRoute = permissions.includes('TIME_TRACKER');
	const actsForAnyEmployee = permissions.includes('CHANGE_SELECTED_EMPLOYEE');
	return reachesStatusRoute && !actsForAnyEmployee;
}

/** Whether the membership is the employee's and still in effect. The API counts a missing flag as in effect. */
function isActiveMembership(member: TeamMembership, employeeId: ID): boolean {
	const isEmployee = member.employeeId === employeeId;
	const isActive = member.isActive !== false;
	const isNotArchived = member.isArchived !== true;
	return isEmployee && isActive && isNotArchived;
}

/** Whether the employee manages the team through this membership. The API reads the manager flag, not the role. */
function isActiveManagerMembership(member: TeamMembership, employeeId: ID): boolean {
	const isFlaggedManager = member.isManager === true;
	const isActiveMember = isActiveMembership(member, employeeId);
	return isFlaggedManager && isActiveMember;
}

/** Whether the manager manages the team and the employee is one of its members. */
function managesMemberOfTeam(team: ReviewerTeam, managerId: ID, employeeId: ID): boolean {
	const members = team.members ?? [];
	const managesTeam = members.some((member) => isActiveManagerMembership(member, managerId));
	if (!managesTeam) {
		return false;
	}
	return members.some((member) => isActiveMembership(member, employeeId));
}

/** Whether the employee is not the manager and is a member of a team the manager manages. */
function managesEmployee(teams: readonly ReviewerTeam[], managerId: ID, employeeId: ID | undefined): boolean {
	if (!employeeId) {
		return false;
	}
	const isOwnTimesheet = employeeId === managerId;
	if (isOwnTimesheet) {
		return false;
	}
	return teams.some((team) => managesMemberOfTeam(team, managerId, employeeId));
}

/**
 * The statuses the user may give the timesheets of these time logs, as PUT /timesheet/status accepts them. With
 * CAN_APPROVE_TIMESHEET, any status on any timesheet. As a team manager, approved or denied, when every timesheet
 * belongs to another member of a team they manage, never their own. Otherwise none.
 */
export function getAllowedTimesheetStatuses(
	reviewer: TimesheetReviewer,
	logs: readonly ReviewedTimeLog[]
): readonly ETimesheetStatus[] {
	const approvesAnyTimesheet = canApproveAnyTimesheet(reviewer.permissions);
	if (approvesAnyTimesheet) {
		return ANY_TIMESHEET_STATUS;
	}

	const managerId = reviewer.employeeId;
	const reachesCheck = reachesTeamManagerCheck(reviewer.permissions);
	if (!reachesCheck || !managerId) {
		return NO_TIMESHEET_STATUS;
	}

	// No time log means no timesheet to review, and every() below would hold on an empty list
	const hasNoTimeLog = logs.length === 0;
	if (hasNoTimeLog) {
		return NO_TIMESHEET_STATUS;
	}

	const timesheetEmployeeIds = logs.map((log) => log.employeeId);
	const employeeIds = [...new Set(timesheetEmployeeIds)];
	const managesEveryEmployee = employeeIds.every((employeeId) =>
		managesEmployee(reviewer.teams, managerId, employeeId)
	);
	if (!managesEveryEmployee) {
		return NO_TIMESHEET_STATUS;
	}

	return TEAM_MANAGER_STATUSES;
}
