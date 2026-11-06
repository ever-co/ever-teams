import { ETimerStatus } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('../duplicated-components/tooltip', () => ({ Tooltip: () => null }));
jest.mock('../icons', () => ({ OnlineIcon: () => null, Pause: () => null, Play: () => null, StopCircle: () => null }));

import { getTimerStatusValue } from './timer-status';

const tracking = { isActive: true, isOnline: true, isTrackingTime: true };
const stoppedButOnline = { isActive: true, isOnline: true, isTrackingTime: false };

const member = (employee: Record<string, unknown>, timerStatus: ETimerStatus) => ({
	employeeId: 'employee-1',
	employee,
	timerStatus,
	totalTodayTasks: [{ id: 'task-1', duration: 600 }]
});

describe('team member status badge', () => {
	it('reads running while Gauzy flags the member as tracking, even when their last log in this team is paused', () => {
		expect(getTimerStatusValue(null, member(tracking, ETimerStatus.PAUSE))).toBe(ETimerStatus.RUNNING);
	});

	it('keeps pause for a member whose timer is stopped', () => {
		expect(getTimerStatusValue(null, member(stoppedButOnline, ETimerStatus.PAUSE))).toBe(ETimerStatus.PAUSE);
	});

	it('keeps pause on the signed-in member card once their desktop timer stopped, before the team read catches up', () => {
		const ownStatus = {
			running: false,
			lastLog: { employeeId: 'employee-1', startedAt: new Date().toISOString(), source: 'DESKTOP' }
		} as unknown as ITimerStatus;

		expect(getTimerStatusValue(ownStatus, member(tracking, ETimerStatus.PAUSE))).toBe(ETimerStatus.PAUSE);
	});

	it('keeps suspended above running', () => {
		const suspended = { ...tracking, isActive: false };

		expect(getTimerStatusValue(null, member(suspended, ETimerStatus.PAUSE))).toBe(ETimerStatus.SUSPENDED);
	});
});
