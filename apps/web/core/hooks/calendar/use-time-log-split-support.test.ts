import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { checkSplitSupport } from './use-time-log-split-support';

/** An Axios-like error of the API, as the service rethrows it. */
function apiError(status: number, message: string) {
	return Object.assign(new Error(message), { response: { status, data: { statusCode: status, message } } });
}

/** A manual entry from 09:00 to 13:00, as the Calendar read it before another tab moved its start to 08:00. */
const AS_READ = {
	id: 'manual',
	startedAt: '2026-11-09T09:00:00.000Z',
	stoppedAt: '2026-11-09T13:00:00.000Z',
	logType: 'MANUAL'
} as unknown as ITimeLog;

describe('checkSplitSupport (#5369)', () => {
	beforeEach(() => {
		jest.spyOn(timeLogService as never, 'organizationId', 'get').mockReturnValue('organization-a' as never);
		jest.spyOn(timeLogService as never, 'tenantId', 'get').mockReturnValue('tenant-a' as never);
	});

	afterEach(() => jest.restoreAllMocks());

	it('asks the route with a body its validation refuses, never with a split the entry could take since', async () => {
		const post = jest.spyOn(timeLogService, 'post').mockRejectedValue(apiError(400, 'splitAt should not be empty'));
		const split = jest.spyOn(timeLogService, 'splitTimeLog');

		await checkSplitSupport(AS_READ);

		expect(split).not.toHaveBeenCalled();
		expect(post).toHaveBeenCalledTimes(1);
		const [url, body] = post.mock.calls[0];
		expect(url).toBe('/timesheet/time-log/manual/split');
		expect(body).toEqual({});
	});

	it('reads the refusal of an API with the route as supported', async () => {
		jest.spyOn(timeLogService, 'post').mockRejectedValue(apiError(400, 'splitAt should not be empty'));

		await expect(checkSplitSupport(AS_READ)).resolves.toBe('supported');
	});

	it('reads the 404 of an API without the route as not offered', async () => {
		jest.spyOn(timeLogService, 'post').mockRejectedValue(
			apiError(404, 'Cannot POST /api/timesheet/time-log/manual/split')
		);

		await expect(checkSplitSupport(AS_READ)).resolves.toBe('not-offered');
	});

	it('throws on an outage, which says neither', async () => {
		jest.spyOn(timeLogService, 'post').mockRejectedValue(new Error('Network Error'));

		await expect(checkSplitSupport(AS_READ)).rejects.toThrow('Network Error');
	});
});
