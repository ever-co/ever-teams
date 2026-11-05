import { ETimerStatus } from '@/core/types/generics/enums/timer';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { isTrackingOutsideTeam } from './team-member-tracking';

const member = (employeeId: string, employee: Record<string, unknown>, timerStatus?: ETimerStatus) =>
	({ employeeId, employee, timerStatus }) as unknown as TOrganizationTeamEmployee;

const tracking = { isOnline: true, isTrackingTime: true };

describe('a timer running outside the team', () => {
	it('is a member Gauzy flags as tracking while their last log in this team is not running', () => {
		expect(isTrackingOutsideTeam(member('employee-1', tracking, ETimerStatus.PAUSE))).toBe(true);
		expect(isTrackingOutsideTeam(member('employee-1', tracking, ETimerStatus.IDLE))).toBe(true);
		expect(isTrackingOutsideTeam(member('employee-1', tracking))).toBe(true);
	});

	it('is not a member running in this team, nor one Gauzy does not flag as tracking', () => {
		expect(isTrackingOutsideTeam(member('employee-1', tracking, ETimerStatus.RUNNING))).toBe(false);
		expect(isTrackingOutsideTeam(member('employee-1', { isOnline: true }, ETimerStatus.PAUSE))).toBe(false);
		expect(isTrackingOutsideTeam(member('employee-1', { isTrackingTime: true }, ETimerStatus.PAUSE))).toBe(false);
		expect(isTrackingOutsideTeam(undefined)).toBe(false);
	});
});
