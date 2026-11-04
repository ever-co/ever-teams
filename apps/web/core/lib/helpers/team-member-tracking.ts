import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

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
