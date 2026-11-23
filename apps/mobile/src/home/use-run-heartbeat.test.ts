import { act, renderHook } from '@testing-library/react-native';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import { sendTimeSlot } from '../data/timer';
import { forgetRun } from './heartbeat';
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

// A minute at a time, the answers of one minute's heartbeat coming before the next, as they do on a phone
async function minutesPass(minutes: number) {
	for (let minute = 0; minute < minutes; minute += 1) {
		await act(async () => {
			jest.advanceTimersByTime(60_000);
		});
	}
}

beforeEach(() => {
	jest.clearAllMocks();
	forgetRun();
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

	it('goes on from where it was when a renewal replaces the session, with the renewed token', async () => {
		timerIs(true);
		const { rerender } = await renderHook(() => useRunHeartbeat());
		await minutesPass(1);
		const renewed = { ...kofi, accessToken: 'access-2' };
		(useSignedInSession as jest.Mock).mockReturnValue(renewed);
		await rerender({});

		await minutesPass(1);

		expect(sendTimeSlot).toHaveBeenCalledTimes(2);
		expect(sendTimeSlot).toHaveBeenLastCalledWith(renewed, expect.objectContaining({ seconds: 60 }));
	});

	it('leaves a heartbeat out while the previous one is on its way, and the next covers both minutes', async () => {
		timerIs(true);
		let answer: () => void = () => undefined;
		(sendTimeSlot as jest.Mock).mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					answer = resolve;
				})
		);
		await renderHook(() => useRunHeartbeat());

		await minutesPass(1);
		await minutesPass(1);
		await act(async () => {
			answer();
		});
		await minutesPass(1);

		const seconds = (sendTimeSlot as jest.Mock).mock.calls.map(([, slot]) => slot.seconds);
		expect(seconds).toEqual([60, 120]);
	});
});
