/**
 * POST /api/timer/start builds the Gauzy body itself, so a break (Gauzy #11940) reaches Gauzy only when the route
 * forwards the type: work by default, a break when asked, never a billable break, and nothing else.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();
const mockStartTimerRequest = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

jest.mock('@/core/services/server/requests', () => ({
	startTimerRequest: (...args: unknown[]) => mockStartTimerRequest(...args),
	getTimerStatusRequest: async () => ({ data: { running: false } }),
	readTodayRange: () => ({})
}));

import { POST } from './route';

function startTimer(body: Record<string, unknown>) {
	const request = new Request('https://app.ever.team/api/timer/start', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return POST(request);
}

function sentToGauzy(): Record<string, unknown> {
	const [params] = mockStartTimerRequest.mock.calls[0];
	return params;
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
	mockStartTimerRequest.mockResolvedValue({ data: {} });
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('POST /api/timer/start with a break', () => {
	it('starts a break when the body asks for one, never billable', async () => {
		const response = await startTimer({ taskId: 'task-1', logType: 'BREAK', isBillable: true });

		expect(response.status).toBe(200);
		expect(sentToGauzy()).toMatchObject({ taskId: 'task-1', logType: 'BREAK', isBillable: false });
	});

	it('starts work for a client that sends no type, as before breaks', async () => {
		await startTimer({ taskId: 'task-1', isBillable: true });

		expect(sentToGauzy()).toMatchObject({ logType: 'TRACKED', isBillable: true });
	});

	it('refuses any other type without calling Gauzy', async () => {
		const response = await startTimer({ taskId: 'task-1', logType: 'MANUAL' });

		expect(response.status).toBe(400);
		expect(mockStartTimerRequest).not.toHaveBeenCalled();
	});

	// Gauzy refuses a break with a body that carries no status (403 BREAKS_NOT_ALLOWED): without it the refusal would
	// reach the timer as a 502, its reason lost
	it('keeps the status of a refused break, so the timer can say why', async () => {
		await startTimer({ taskId: 'task-1', logType: 'BREAK' });

		const [, , options] = mockStartTimerRequest.mock.calls[0];
		expect(options).toEqual({ keepsStatusOnError: true });
	});

	it('reads the refusal of a work start as before', async () => {
		await startTimer({ taskId: 'task-1' });

		const [, , options] = mockStartTimerRequest.mock.calls[0];
		expect(options).toBeUndefined();
	});
});
