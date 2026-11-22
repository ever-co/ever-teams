/**
 * PUT /timesheet/status takes any status from a CAN_APPROVE_TIMESHEET holder, and approved or denied from a team
 * manager (through TIME_TRACKER) for the timesheets of the members of the teams they manage, never their own. The
 * web shows approve and reject exactly where the API takes them.
 */
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import {
	getAllowedTimesheetStatuses,
	offersApproveAndReject,
	reviewStatusesOf,
	type TimesheetReviewer
} from './timesheet-review';

type Team = TimesheetReviewer['teams'][number];
type Membership = NonNullable<Team['members']>[number];

const MANAGER_ID = 'employee-manager';
const MEMBER_ID = 'employee-member';
const OUTSIDER_ID = 'employee-outsider';
const TEAM_MANAGER_STATUSES = [ETimesheetStatus.APPROVED, ETimesheetStatus.DENIED];

const team = (...members: Membership[]): Team => ({ members });
const managedTeam = (manager: Partial<Membership> = {}, member: Partial<Membership> = {}): Team =>
	team({ employeeId: MANAGER_ID, isManager: true, ...manager }, { employeeId: MEMBER_ID, ...member });

const teamManager = (overrides: Partial<TimesheetReviewer> = {}): TimesheetReviewer => ({
	permissions: ['TIME_TRACKER'],
	employeeId: MANAGER_ID,
	teams: [managedTeam()],
	...overrides
});

/** The statuses the reviewer may give the timesheets of these employees' time logs. */
const statusesFor = (reviewer: TimesheetReviewer, ...employeeIds: (string | undefined)[]) => {
	const logs = employeeIds.map((employeeId) => ({ employeeId }));
	return getAllowedTimesheetStatuses(reviewer, logs);
};

describe('getAllowedTimesheetStatuses', () => {
	it('lets a CAN_APPROVE_TIMESHEET holder give any status to any timesheet, their own included', () => {
		const approver = teamManager({ permissions: ['CAN_APPROVE_TIMESHEET'], teams: [] });

		const statuses = statusesFor(approver, MANAGER_ID, OUTSIDER_ID);

		expect(statuses).toEqual(Object.values(ETimesheetStatus));
	});

	it('lets a team manager approve or deny the timesheets of the members of the team', () => {
		const reviewer = teamManager();

		const statuses = statusesFor(reviewer, MEMBER_ID, MEMBER_ID);

		expect(statuses).toEqual(TEAM_MANAGER_STATUSES);
	});

	it('never lets a team manager approve or deny their own timesheet, alone or along with a member', () => {
		const reviewer = teamManager();

		const ownOnly = statusesFor(reviewer, MANAGER_ID);
		const ownWithMember = statusesFor(reviewer, MEMBER_ID, MANAGER_ID);

		expect(ownOnly).toEqual([]);
		expect(ownWithMember).toEqual([]);
	});

	it('gives a team manager nothing when no time log is passed', () => {
		const reviewer = teamManager();

		const statuses = statusesFor(reviewer);

		expect(statuses).toEqual([]);
	});

	it('refuses a timesheet of an employee who is in no team the user manages', () => {
		const sharedTeam = team({ employeeId: MANAGER_ID, isManager: false }, { employeeId: OUTSIDER_ID });
		const reviewer = teamManager({ teams: [managedTeam(), sharedTeam] });

		const outsiderOnly = statusesFor(reviewer, OUTSIDER_ID);
		const outsiderWithMember = statusesFor(reviewer, MEMBER_ID, OUTSIDER_ID);
		const unknownEmployee = statusesFor(reviewer, undefined);

		expect(outsiderOnly).toEqual([]);
		expect(outsiderWithMember).toEqual([]);
		expect(unknownEmployee).toEqual([]);
	});

	it('reads the manager flag of the membership, as the API does, not the manager role', () => {
		const roleOnlyManager = { employeeId: MANAGER_ID, role: { name: 'MANAGER' } } as Membership;
		const reviewer = teamManager({ teams: [team(roleOnlyManager, { employeeId: MEMBER_ID })] });

		const statuses = statusesFor(reviewer, MEMBER_ID);

		expect(statuses).toEqual([]);
	});

	it('counts a membership without its active or archived flag as in effect, and refuses one that ended', () => {
		const unflagged = { isActive: null, isArchived: null };
		const legacyMemberships = teamManager({ teams: [managedTeam(unflagged, unflagged)] });
		const legacyStatuses = statusesFor(legacyMemberships, MEMBER_ID);
		expect(legacyStatuses).toEqual(TEAM_MANAGER_STATUSES);

		const endedMemberships = [
			managedTeam({ isActive: false }),
			managedTeam({ isArchived: true }),
			managedTeam({}, { isActive: false }),
			managedTeam({}, { isArchived: true })
		];
		for (const ended of endedMemberships) {
			const reviewer = teamManager({ teams: [ended] });
			const statuses = statusesFor(reviewer, MEMBER_ID);
			expect(statuses).toEqual([]);
		}
	});

	it("reads a membership's employee from its employee when the team was read without employeeId (#5622)", () => {
		const managerById = { employeeId: null, employee: { id: MANAGER_ID } };
		const memberById = { employeeId: null, employee: { id: MEMBER_ID } };
		const reviewer = teamManager({ teams: [managedTeam(managerById, memberById)] });

		const memberStatuses = statusesFor(reviewer, MEMBER_ID);
		const ownStatuses = statusesFor(reviewer, MANAGER_ID);

		expect(memberStatuses).toEqual(TEAM_MANAGER_STATUSES);
		expect(ownStatuses).toEqual([]);
	});

	it('gives nothing to a team manager the API refuses before its team check', () => {
		const withoutTimeTracker = teamManager({ permissions: [] });
		const withoutEmployee = teamManager({ employeeId: null });

		for (const reviewer of [withoutTimeTracker, withoutEmployee]) {
			const statuses = statusesFor(reviewer, MEMBER_ID);
			expect(statuses).toEqual([]);
		}
	});

	it('runs the team check for a team manager who also holds CHANGE_SELECTED_EMPLOYEE, as the API does', () => {
		const actsForAnyEmployee = teamManager({ permissions: ['TIME_TRACKER', 'CHANGE_SELECTED_EMPLOYEE'] });

		const memberStatuses = statusesFor(actsForAnyEmployee, MEMBER_ID);
		const ownStatuses = statusesFor(actsForAnyEmployee, MANAGER_ID);
		const outsiderStatuses = statusesFor(actsForAnyEmployee, OUTSIDER_ID);

		expect(memberStatuses).toEqual(TEAM_MANAGER_STATUSES);
		expect(ownStatuses).toEqual([]);
		expect(outsiderStatuses).toEqual([]);
	});
});

describe('reviewStatusesOf and offersApproveAndReject, what a page offers (#5622)', () => {
	const memberLogs = [{ employeeId: MEMBER_ID }];
	const ownLogs = [{ employeeId: MANAGER_ID }];

	it("offers a team manager without CAN_APPROVE_TIMESHEET approve and reject on a member's timesheet, never their own", () => {
		const access = { canApprove: false, reviewer: teamManager() };

		expect(reviewStatusesOf(access, memberLogs)).toEqual(TEAM_MANAGER_STATUSES);
		expect(offersApproveAndReject(access, memberLogs)).toBe(true);
		expect(reviewStatusesOf(access, ownLogs)).toEqual([]);
		expect(offersApproveAndReject(access, ownLogs)).toBe(false);
	});

	it('keeps every status on every timesheet for a role that approves any timesheet, as before', () => {
		const withReviewer = { canApprove: true, reviewer: teamManager() };
		const withoutReviewer = { canApprove: true };

		for (const access of [withReviewer, withoutReviewer]) {
			expect(reviewStatusesOf(access, ownLogs)).toEqual(Object.values(ETimesheetStatus));
			expect(offersApproveAndReject(access, memberLogs)).toBe(true);
		}
	});

	it('offers nothing on a page that passes no reviewer, as before', () => {
		const access = { canApprove: false };

		expect(reviewStatusesOf(access, memberLogs)).toEqual([]);
		expect(offersApproveAndReject(access, memberLogs)).toBe(false);
	});

	it('offers nothing to a plain member, who manages no team', () => {
		const plainMember = teamManager({ employeeId: MEMBER_ID, teams: [managedTeam()] });
		const access = { canApprove: false, reviewer: plainMember };
		const theirOwnLogs = memberLogs;
		const theirManagerLogs = ownLogs;

		expect(offersApproveAndReject(access, theirOwnLogs)).toBe(false);
		expect(offersApproveAndReject(access, theirManagerLogs)).toBe(false);
	});
});
