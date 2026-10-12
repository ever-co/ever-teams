import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

const mockPresenceEnabled = { value: true };

jest.mock('@/core/constants/config/constants', () => ({
	EMPLOYEE_PRESENCE_CONSTANTS: { HEARTBEAT_INTERVAL_MS: 60_000, IDLE_AFTER_MS: 600_000, ONLINE_WINDOW_MS: 180_000 },
	// Lazy: the factory runs while this module is still being imported
	get EMPLOYEE_PRESENCE_ENABLED() {
		return mockPresenceEnabled;
	}
}));

import { getMemberFilterStatus, getMemberPresence } from './team-members.utils';

const member = (employee: Record<string, unknown>, timerStatus?: ETimerStatus) =>
	({ employee, timerStatus }) as unknown as TOrganizationTeamEmployee;

describe('team presence', () => {
	beforeEach(() => {
		mockPresenceEnabled.value = true;
	});

	it('reads a recent heartbeat as online or idle, and an old or missing one as offline', () => {
		const now = new Date().toISOString();
		expect(getMemberPresence({ lastSeenAt: now, isIdle: false })).toBe('online');
		expect(getMemberPresence({ lastSeenAt: now, isIdle: true })).toBe('idle');
		expect(getMemberPresence({ lastSeenAt: new Date(Date.now() - 10 * 60_000).toISOString() })).toBe('offline');
		expect(getMemberPresence({})).toBe('offline');
	});

	it('is off for every member when the deployment turns presence off', () => {
		mockPresenceEnabled.value = false;
		expect(getMemberPresence({ lastSeenAt: new Date().toISOString(), isIdle: false })).toBe('offline');
	});

	it('filters a present member who is not tracking as online, as the badge shows it', () => {
		const present = { lastSeenAt: new Date().toISOString(), isIdle: false };
		expect(getMemberFilterStatus(member(present, ETimerStatus.IDLE))).toBe(ETimerStatus.ONLINE);
		// Tracking and pause keep their status
		expect(getMemberFilterStatus(member({ ...present, isTrackingTime: true }, ETimerStatus.RUNNING))).toBe(
			ETimerStatus.RUNNING
		);
		expect(getMemberFilterStatus(member(present, ETimerStatus.PAUSE))).toBe(ETimerStatus.PAUSE);
	});

	it('keeps Gauzy timer status in the filters when presence is off', () => {
		mockPresenceEnabled.value = false;
		const present = { lastSeenAt: new Date().toISOString(), isIdle: false };
		expect(getMemberFilterStatus(member(present, ETimerStatus.IDLE))).toBe(ETimerStatus.IDLE);
	});
});
