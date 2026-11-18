import { act, renderHook } from '@testing-library/react-native';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import { sendTimeSlot } from '../data/timer';
import { useEmployeeId, useSignedInSession, useTimerStatus } from './use-home-timer';
import { useRunHeartbeat } from './use-run-heartbeat';

jest.mock('../data/timer', () => ({ sendTimeSlot: jest.fn() }));
jest.mock('./use-home-timer', () => ({
	useSignedInSession: jest.fn(),
	useTimerStatus: jest.fn(),
	useEmployeeId: jest.fn()
}));

const kofi = { accessToken: 'access', tenantId: 'tenant', organizationId: 'organization' };

function timerIs(running: boolean) {
	(useTimerStatus as jest.Mock).mockReturnValue({
		data: {
			duration: 6740,
			running,
			lastLog: { id: 'log-1', startedAt: '2026-11-18T08:00:00.000Z', source: TimerSource.BROWSER }
		}
	});
}

async function minutesPass(minutes: number) {
	await act(async () => {
		jest.advanceTimersByTime(minutes * 60_000);
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	(useSignedInSession as jest.Mock).mockReturnValue(kofi);
	(useEmployeeId as jest.Mock).mockReturnValue({ data: 'employee-kofi' });
	(sendTimeSlot as jest.Mock).mockResolvedValue(undefined);
});

describe('the running timer', () => {
	it('tells the API every minute that it goes on, with the source of its log', async () => {
		timerIs(true);
		await renderHook(() => useRunHeartbeat());

		await minutesPass(2);

		expect(sendTimeSlot).toHaveBeenCalledTimes(2);
		expect(sendTimeSlot).toHaveBeenLastCalledWith(kofi, {
			employeeId: 'employee-kofi',
			source: TimerSource.BROWSER,
			seconds: 60
		});
	});

	it('says nothing while stopped', async () => {
		timerIs(false);
		await renderHook(() => useRunHeartbeat());

		await minutesPass(3);

		expect(sendTimeSlot).not.toHaveBeenCalled();
	});

	it('covers a failed heartbeat with the next one', async () => {
		timerIs(true);
		(sendTimeSlot as jest.Mock).mockRejectedValueOnce(new Error('offline'));
		await renderHook(() => useRunHeartbeat());

		await minutesPass(1);
		await minutesPass(1);
		await minutesPass(1);

		const seconds = (sendTimeSlot as jest.Mock).mock.calls.map(([, slot]) => slot.seconds);
		expect(seconds).toEqual([60, 120, 60]);
	});
});
