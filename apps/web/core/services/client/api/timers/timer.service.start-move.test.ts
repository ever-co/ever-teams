/**
 * The running time's panel moves the start of the caller's running timer through Gauzy's
 * `PUT /timesheet/timer/started-at` in direct mode, and through this app's `/api/timer/started-at` in proxy mode. One
 * check tells whether the API behind the app has that route: an API without it answers 404, and the panel then shows
 * the start alone, as today.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ApiErrorService } from '../../api-error.service';
import { timerService } from './timer.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

const newStart = new Date('2026-11-16T08:00:00.000Z');

afterEach(() => {
	jest.restoreAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('TimerService.moveTimerStart', () => {
	it("sends the new start to Gauzy's route in direct mode, then reads the timer status again", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const put = jest.spyOn(timerService, 'put').mockResolvedValue({ data: {} } as never);
		const status = { data: { running: true, duration: 3600 } };
		const getTimerStatus = jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue(status as never);

		const answer = await timerService.moveTimerStart({ startedAt: newStart, reason: 'Forgot to start timer' });

		expect(put).toHaveBeenCalledWith('/timesheet/timer/started-at', {
			startedAt: '2026-11-16T08:00:00.000Z',
			reason: 'Forgot to start timer'
		});
		expect(getTimerStatus).toHaveBeenCalledTimes(1);
		expect(answer).toBe(status);
	});

	it("sends it to the app's own route in proxy mode", async () => {
		const put = jest.spyOn(timerService, 'put').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.moveTimerStart({ startedAt: newStart });

		expect(put).toHaveBeenCalledWith('/timer/started-at', { startedAt: '2026-11-16T08:00:00.000Z' });
	});

	it('sends no reason when none was typed', async () => {
		const put = jest.spyOn(timerService, 'put').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.moveTimerStart({ startedAt: newStart, reason: '   ' });

		expect(put).toHaveBeenCalledWith('/timer/started-at', { startedAt: '2026-11-16T08:00:00.000Z' });
	});

	it('reports a saved move as saved when the status read after it fails', async () => {
		jest.spyOn(timerService, 'put').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockRejectedValue(new ApiErrorService('Bad Gateway', 502));

		await expect(timerService.moveTimerStart({ startedAt: newStart })).resolves.toEqual({ data: undefined });
	});

	it('lets a refusal through to the caller, with its reason code, and reads no status', async () => {
		const refusal = new ApiErrorService('The new start overlaps another entry.', 409, 'TIMER_START_OVERLAP');
		jest.spyOn(timerService, 'put').mockRejectedValue(refusal);
		const getTimerStatus = jest.spyOn(timerService, 'getTimerStatus');

		await expect(timerService.moveTimerStart({ startedAt: newStart })).rejects.toBe(refusal);
		expect(getTimerStatus).not.toHaveBeenCalled();
	});
});

describe('TimerService.getTimerStartMoveSupport', () => {
	it('reads an empty body refused by the route as an API that can move the start', async () => {
		const put = jest
			.spyOn(timerService, 'put')
			.mockRejectedValue(new ApiErrorService('startedAt should not be empty', 400));

		await expect(timerService.getTimerStartMoveSupport()).resolves.toBe('supported');
		expect(put).toHaveBeenCalledWith('/timer/started-at', {});
	});

	it('reads a missing route as an API that cannot move it', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const put = jest
			.spyOn(timerService, 'put')
			.mockRejectedValue(new ApiErrorService('Cannot PUT /api/timesheet/timer/started-at', 404));

		await expect(timerService.getTimerStartMoveSupport()).resolves.toBe('unsupported');
		expect(put).toHaveBeenCalledWith('/timesheet/timer/started-at', {});
	});

	it('leaves any other answer to the save, which says what went wrong', async () => {
		jest.spyOn(timerService, 'put').mockRejectedValue(new ApiErrorService('Bad Gateway', 502));

		await expect(timerService.getTimerStartMoveSupport()).resolves.toBe('supported');
	});
});
