import { ETimerStatus } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { employeeIdsTrackingOutsideTeam, isTrackingOutsideTeam, todaySecondsWithoutTeam } from './team-member-tracking';

const member = (employeeId: string, employee: Record<string, unknown>, timerStatus?: ETimerStatus) =>
	({ employeeId, employee, timerStatus }) as unknown as TOrganizationTeamEmployee;

const tracking = { isOnline: true, isTrackingTime: true };

const runningLog = (lastLog: Record<string, unknown>, running = true) =>
	({ running, lastLog: { employeeId: 'employee-1', ...lastLog } }) as unknown as ITimerStatus;

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

	it('lists those members once per set, in the same order whatever the team order', () => {
		const members = [
			member('employee-b', tracking, ETimerStatus.PAUSE),
			member('employee-c', tracking, ETimerStatus.RUNNING),
			member('employee-a', tracking, ETimerStatus.IDLE),
			member('employee-d', {}, ETimerStatus.PAUSE)
		];

		expect(employeeIdsTrackingOutsideTeam(members)).toEqual(['employee-a', 'employee-b']);
		expect(employeeIdsTrackingOutsideTeam(undefined)).toEqual([]);
	});
});

describe('today seconds of a running log with no team', () => {
	const now = new Date(2026, 10, 5, 10, 0, 0);

	it('counts a running log with no team from its start', () => {
		const status = runningLog({ startedAt: new Date(2026, 10, 5, 9, 0, 0), organizationTeamId: null });

		expect(todaySecondsWithoutTeam(status, now)).toBe(3600);
	});

	it('counts a log started yesterday from the start of today', () => {
		const status = runningLog({ startedAt: new Date(2026, 10, 4, 22, 0, 0) });

		expect(todaySecondsWithoutTeam(status, now)).toBe(10 * 3600);
	});

	it('counts nothing for a log filed under a team, a stopped log or no log', () => {
		const startedAt = new Date(2026, 10, 5, 9, 0, 0);

		expect(todaySecondsWithoutTeam(runningLog({ startedAt, organizationTeamId: 'team-2' }), now)).toBe(0);
		expect(todaySecondsWithoutTeam(runningLog({ startedAt }, false), now)).toBe(0);
		expect(todaySecondsWithoutTeam(runningLog({}), now)).toBe(0);
		expect(todaySecondsWithoutTeam(undefined, now)).toBe(0);
	});

	it('counts nothing for the new day from a read made before midnight', () => {
		const status = runningLog({ startedAt: new Date(2026, 10, 4, 22, 0, 0) });
		const readBeforeMidnight = new Date(2026, 10, 4, 23, 59, 0);

		expect(todaySecondsWithoutTeam(status, readBeforeMidnight, now)).toBe(0);
	});

	it('counts up to the read, from the start of the day the card is drawn on', () => {
		const status = runningLog({ startedAt: new Date(2026, 10, 4, 22, 0, 0) });
		const readAt = new Date(2026, 10, 5, 9, 30, 0);

		expect(todaySecondsWithoutTeam(status, readAt, now)).toBe(9.5 * 3600);
	});

	it('counts nothing for a start time that does not read as a date', () => {
		const status = runningLog({ startedAt: 'not a date', organizationTeamId: null });

		expect(todaySecondsWithoutTeam(status, now)).toBe(0);
	});

	it('never counts below zero when the browser clock is behind the start', () => {
		const status = runningLog({ startedAt: new Date(2026, 10, 5, 10, 5, 0) });

		expect(todaySecondsWithoutTeam(status, now)).toBe(0);
	});
});
