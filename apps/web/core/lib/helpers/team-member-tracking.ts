import { differenceInSeconds, max, startOfDay } from 'date-fns';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

/**
 * Whether a team member can track time in this team. Gauzy refuses a start when the employee's own switch is off,
 * whatever the team switch says; a team read that does not select the employee's switch leaves it out, so only an
 * explicit `false` turns it off.
 */
export function canMemberTrackTime(member: TOrganizationTeamEmployee | undefined): boolean {
	const isTeamTrackingOn = Boolean(member?.isTrackingEnabled);
	const isEmployeeTrackingOff = member?.employee?.isTrackingEnabled === false;
	return isTeamTrackingOn && !isEmployeeTrackingOff;
}

/**
 * Whether the member's timer runs while their last log in this team does not. The team read only sees the logs
 * filed under this team, so a timer started with no team (the desktop allows it) or in another team reads as paused
 * or idle there, while Gauzy flags the employee as tracking.
 */
export function isTrackingOutsideTeam(member: TOrganizationTeamEmployee | undefined): boolean {
	const isTracking = Boolean(member?.employee?.isOnline && member?.employee?.isTrackingTime);
	const isRunningInTeam = member?.timerStatus === ETimerStatus.RUNNING;
	return isTracking && !isRunningInTeam;
}

/**
 * Today's seconds of a running log saved with no team, which the team's own totals never count. A log started before
 * today counts from today's start; any other log counts nothing.
 */
export function todaySecondsWithoutTeam(status: ITimerStatus | undefined, now: Date): number {
	const lastLog = status?.lastLog;
	const isRunning = Boolean(status?.running);
	if (!isRunning || !lastLog?.startedAt) {
		return 0;
	}
	if (lastLog.organizationTeamId) {
		return 0;
	}

	const startedAt = new Date(lastLog.startedAt);
	const todayStart = startOfDay(now);
	const countedFrom = max([startedAt, todayStart]);
	const seconds = differenceInSeconds(now, countedFrom);
	return Math.max(seconds, 0);
}

/** The employee ids of the members whose timer runs outside the team, sorted so the same members give the same list. */
export function employeeIdsTrackingOutsideTeam(members: TOrganizationTeamEmployee[] | null | undefined): string[] {
	const trackingMembers = (members ?? []).filter((member) => isTrackingOutsideTeam(member));
	const employeeIds = trackingMembers.map((member) => member.employeeId);
	const knownEmployeeIds = employeeIds.filter((employeeId): employeeId is string => Boolean(employeeId));
	return knownEmployeeIds.sort();
}
