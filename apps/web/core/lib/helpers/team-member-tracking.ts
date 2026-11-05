import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
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
