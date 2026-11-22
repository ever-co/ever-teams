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
 * team manager in through TIME_TRACKER. The check reads the caller's own employee from their user, so a team
 * manager who also holds CHANGE_SELECTED_EMPLOYEE goes through it as well: that permission grants no approval.
 */
function reachesTeamManagerCheck(permissions: readonly string[]): boolean {
	return permissions.includes('TIME_TRACKER');
}

/** Whether the membership is still in effect. The API counts a missing flag as in effect. */
export function isMembershipInEffect(member: Pick<TeamMembership, 'isActive' | 'isArchived'>): boolean {
	const isActive = member.isActive !== false;
	const isNotArchived = member.isArchived !== true;
	return isActive && isNotArchived;
}

/** Whether the membership is the employee's and still in effect. */
function isActiveMembership(member: TeamMembership, employeeId: ID): boolean {
	const isEmployee = member.employeeId === employeeId;
	return isEmployee && isMembershipInEffect(member);
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

/**
 * What a page knows of the person who reviews: whether their role approves every timesheet, and the reviewer the
 * team manager rule reads, on the pages that pass one.
 */
export interface TimesheetReviewAccess {
	canApprove: boolean;
	reviewer?: TimesheetReviewer | null;
}

/**
 * The statuses a page offers on the timesheets of these time logs: every status when the role approves every
 * timesheet; otherwise those of getAllowedTimesheetStatuses where the page passes its reviewer, and none elsewhere.
 */
export function reviewStatusesOf(
	access: TimesheetReviewAccess,
	logs: readonly ReviewedTimeLog[]
): readonly ETimesheetStatus[] {
	if (access.canApprove) {
		return ANY_TIMESHEET_STATUS;
	}
	const reviewer = access.reviewer;
	if (!reviewer) {
		return NO_TIMESHEET_STATUS;
	}
	return getAllowedTimesheetStatuses(reviewer, logs);
}

/** Whether a page offers Approve and Reject on the timesheets of these time logs. */
export function offersApproveAndReject(access: TimesheetReviewAccess, logs: readonly ReviewedTimeLog[]): boolean {
	const statuses = reviewStatusesOf(access, logs);
	const canApprove = statuses.includes(ETimesheetStatus.APPROVED);
	const canReject = statuses.includes(ETimesheetStatus.DENIED);
	return canApprove && canReject;
}
