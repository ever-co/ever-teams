/**
 * A team can require a daily plan before its members track time. Gauzy used to accept a plan dated the UTC day
 * before, of or after the start, so a member who had only planned tomorrow could track today. The start now names
 * the member's day, the same browser day the timer checks read plans for, in both API modes.
 *
 * The start also names the team of the tab that starts it: the team cookie is shared by every tab, and another tab
 * may have switched it to its own team (#5120).
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

// Another tab has switched the team cookie every tab shares to its own team
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getActiveTeamIdCookie: () => 'team-of-another-tab'
}));

jest.mock('../../api.service', () => ({
	...jest.requireActual('../../api.service'),
	getFallbackAPI: async () => ({ post: mockFallbackPost })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
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

		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', planDay: '2026-11-05' })
		);
	});

	it("sends the member's day to the start route in proxy mode", async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			isBillable: false,
			planDay: '2026-11-05'
		});
	});

	it('sends the notes of the entry to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: false, description: 'Fix the login page' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', description: 'Fix the login page' })
		);
	});

	it('sends no notes field to Gauzy for a start without notes', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		const sentBody = post.mock.calls[0][1];
		expect(sentBody).not.toHaveProperty('description');
	});

	it('sends the notes of the entry to the start route in proxy mode', async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: false, description: 'Fix the login page' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			isBillable: false,
			description: 'Fix the login page',
			planDay: '2026-11-05'
		});
	});

	it("starts on this tab's team, not the one another tab left in the team cookie, in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', organizationTeamId: 'team-of-this-tab', isBillable: false });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ organizationTeamId: 'team-of-this-tab' })
		);
	});

	it("sends this tab's team to the start route in proxy mode", async () => {
		await timerService.startTimer({ taskId: 'task-1', organizationTeamId: 'team-of-this-tab', isBillable: false });

		expect(mockFallbackPost).toHaveBeenCalledWith(
			expect.stringMatching(/^\/timer\/start\?/),
			expect.objectContaining({ organizationTeamId: 'team-of-this-tab' })
		);
	});
});

describe('TimerService.stopTimer', () => {
	it('sends the notes changed during the run to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.stopTimer({ source: ETimeLogSource.TEAMS, description: 'Fix the login page' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/stop',
			expect.objectContaining({ source: ETimeLogSource.TEAMS, description: 'Fix the login page' })
		);
	});

	it('sends the notes changed during the run to the stop route in proxy mode', async () => {
		await timerService.stopTimer({ source: ETimeLogSource.TEAMS, description: '' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/stop\?/), {
			source: ETimeLogSource.TEAMS,
			description: ''
		});
	});

	it('sends no notes field for a stop whose notes did not change', async () => {
		await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/stop\?/), {
			source: ETimeLogSource.TEAMS
		});
	});
});
