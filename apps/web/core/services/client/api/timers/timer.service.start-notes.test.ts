/**
 * A continued time entry hands its notes to the timer start. Gauzy stores the `description` of a start on the new
 * entry, so the notes travel with the request in both API modes, and a start without notes sends what it always did.
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

function sentBodyOf(post: jest.Mock | jest.SpyInstance): Record<string, unknown> {
	const [, body] = post.mock.calls[0];
	return body;
}

beforeEach(() => {
	mockFallbackPost.mockResolvedValue({ data: {} });
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('TimerService.startTimer with the notes of a continued entry', () => {
	it('sends the notes to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: true, description: 'Review the invoices' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', isBillable: true, description: 'Review the invoices' })
		);
	});

	it('sends the notes to the start route in proxy mode', async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: true, description: 'Review the invoices' });

		expect(sentBodyOf(mockFallbackPost)).toMatchObject({
			taskId: 'task-1',
			isBillable: true,
			description: 'Review the invoices'
		});
	});

	it('sends no description key for a start without notes, in either mode', async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: false });
		const proxyBody = sentBodyOf(mockFallbackPost);

		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);
		await timerService.startTimer({ taskId: 'task-1', isBillable: false });
		const directBody = sentBodyOf(post);

		expect(Object.keys(proxyBody)).not.toContain('description');
		expect(Object.keys(directBody)).not.toContain('description');
	});
});
