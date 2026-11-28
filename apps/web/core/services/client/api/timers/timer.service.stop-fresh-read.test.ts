/**
 * #5684, on a deployment with several instances of the web app's server: the stop forgets the session check kept by
 * the instance that took it, and another instance may still answer the person as tracking for a few seconds. After a
 * stop through that server, the next user read asks for a check made anew.
 */
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
import { asksFreshUserRead, forgetProfileSave } from '@/core/lib/utils/fresh-user-read';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { timerService } from './timer.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

beforeEach(() => {
	forgetProfileSave();
	publishedApiOrigin.value = undefined;
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe('TimerService.stopTimer, the user read that follows', () => {
	it("asks for a check made anew after a stop through the web app's own server", async () => {
		mockFallbackPost.mockResolvedValue({ data: { running: false } });

		await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringContaining('/timer/stop'), expect.anything());
		expect(asksFreshUserRead()).toBe(true);
	});

	it('stays an ordinary read when the stop was refused', async () => {
		mockFallbackPost.mockRejectedValue(new Error('Conflict'));

		await timerService.stopTimer({ source: ETimeLogSource.TEAMS }).catch(() => undefined);

		expect(asksFreshUserRead()).toBe(false);
	});

	it('changes nothing in direct mode, where the API itself answers the user', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(asksFreshUserRead()).toBe(false);
	});
});
