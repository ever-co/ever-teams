/**
 * A team can require a daily plan before its members track time. Gauzy used to accept a plan dated the UTC day
 * before, of or after the start, so a member who had only planned tomorrow could track today. The start now names
 * the member's day, the same browser day the timer checks read plans for, in both API modes.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

// The browser runs three hours east of UTC, whatever zone the suite itself runs in: the member's day is computed in
// that zone, so a UTC day would be the day before.
const mockBrowserOffsetMinutes = 3 * 60;

jest.mock('moment', () => {
	const actualMoment = jest.requireActual('moment');
	function browserMoment(...args: unknown[]) {
		if (args.length > 0) {
			return actualMoment(...args);
		}
		return actualMoment().utcOffset(mockBrowserOffsetMinutes);
	}
	return Object.assign(browserMoment, actualMoment);
});

const mockFallbackPost = jest.fn();

jest.mock('../../api.service', () => ({
	...jest.requireActual('../../api.service'),
	getFallbackAPI: async () => ({ post: mockFallbackPost })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { timerService } from './timer.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

beforeEach(() => {
	// 01:30 on the 5th in the browser, still the 4th in UTC.
	jest.useFakeTimers({
		now: new Date('2026-11-04T22:30:00.000Z'),
		doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask']
	});
	mockFallbackPost.mockResolvedValue({ data: {} });
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
	jest.clearAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('TimerService.startTimer', () => {
	it("sends the member's day to Gauzy in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', planDay: '2026-11-05' })
		);
	});

	it("sends the member's day to the start route in proxy mode", async () => {
		await timerService.startTimer({ taskId: 'task-1' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			planDay: '2026-11-05'
		});
	});
});
