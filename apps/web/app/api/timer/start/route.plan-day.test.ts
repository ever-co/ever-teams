/**
 * POST /api/timer/start is the proxy-mode twin of Gauzy's POST /timesheet/timer/start. It builds the Gauzy body
 * itself, so the member's plan day only reaches Gauzy when the route forwards it. A team that requires a daily plan
 * then holds the start to a plan for that day.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();
const mockStartTimerRequest = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

jest.mock('@/core/services/server/requests', () => ({
	startTimerRequest: (...args: unknown[]) => mockStartTimerRequest(...args),
	getTimerStatusRequest: async () => ({ data: { running: true } }),
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

describe('POST /api/timer/start', () => {
	it("forwards the member's plan day to Gauzy", async () => {
		const response = await startTimer({ taskId: 'task-1', planDay: '2026-11-05' });

		expect(response.status).toBe(200);
		expect(sentToGauzy()).toMatchObject({ taskId: 'task-1', planDay: '2026-11-05' });
	});

	it('leaves out a plan day that is not a YYYY-MM-DD date, so Gauzy does not refuse the start', async () => {
		await startTimer({ taskId: 'task-1', planDay: '2026-11-05T00:00:00Z' });

		expect(sentToGauzy().planDay).toBeUndefined();
	});

	it('starts without a plan day for a client that sends none', async () => {
		const response = await startTimer({ taskId: 'task-1' });

		expect(response.status).toBe(200);
		expect(sentToGauzy().planDay).toBeUndefined();
	});
});
