/**
 * POST /api/timer/start is the proxy-mode twin of Gauzy's POST /timesheet/timer/start. It builds the Gauzy body
 * itself, so the notes of a continued entry only reach Gauzy when the route forwards them.
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

describe('POST /api/timer/start with the notes of a continued entry', () => {
	it('forwards the notes of the task the body names', async () => {
		const response = await startTimer({ taskId: 'task-1', description: '  Review the invoices ' });

		expect(response.status).toBe(200);
		expect(sentToGauzy()).toMatchObject({ taskId: 'task-1', description: 'Review the invoices' });
	});

	it('sends no description for a start without notes, or with empty ones', async () => {
		await startTimer({ taskId: 'task-1' });
		await startTimer({ taskId: 'task-1', description: '   ' });

		const [[plainStart], [emptyNotesStart]] = mockStartTimerRequest.mock.calls;
		expect(Object.keys(plainStart)).not.toContain('description');
		expect(Object.keys(emptyNotesStart)).not.toContain('description');
	});

	it("does not put notes on the cookie's task when the body names none", async () => {
		await startTimer({ description: 'Review the invoices' });

		expect(Object.keys(sentToGauzy())).not.toContain('description');
	});

	it('refuses notes that are not text, and starts nothing', async () => {
		const response = await startTimer({ taskId: 'task-1', description: { text: 'Review' } });

		expect(response.status).toBe(400);
		expect(mockStartTimerRequest).not.toHaveBeenCalled();
	});
});
