/**
 * A break from the timer (Gauzy #11940) is a start of type BREAK: never billable, carrying the task work starts again
 * on, in both API modes.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

const mockFallbackPost = jest.fn();

jest.mock('../../api.service', () => ({
	...jest.requireActual('../../api.service'),
	getFallbackAPI: async () => ({ post: mockFallbackPost })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { timerService } from './timer.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

beforeEach(() => {
	mockFallbackPost.mockResolvedValue({ data: {} });
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('TimerService.startBreak', () => {
	it('starts a break on the paused task in direct mode, never billable', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startBreak({ taskId: 'task-1', organizationTeamId: 'team-1' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({
				taskId: 'task-1',
				logType: 'BREAK',
				isBillable: false,
				organizationTeamId: 'team-1'
			})
		);
	});

	it('asks the start route for a break in proxy mode', async () => {
		await timerService.startBreak({ taskId: 'task-1', organizationTeamId: 'team-1' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			organizationTeamId: 'team-1',
			isBillable: false,
			logType: 'BREAK'
		});
	});

	it('sends no task when none is running', async () => {
		await timerService.startBreak({ taskId: null });

		const [, body] = mockFallbackPost.mock.calls[0];
		expect(body).not.toHaveProperty('taskId');
	});
});
