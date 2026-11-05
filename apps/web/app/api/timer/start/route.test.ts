/**
 * POST /api/timer/start is the proxy-mode twin of Gauzy's POST /timesheet/timer/start. When Gauzy refuses the start
 * (403 while time tracking is off), the handler used to throw and the browser got a 500, so the timer could not say
 * why. It now gets Gauzy's status and body; a Gauzy it cannot reach gives a 502.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { POST } from './route';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const originalFetch = global.fetch;

function startTimer() {
	const request = new Request('https://app.ever.team/api/timer/start', {
		method: 'POST',
		body: JSON.stringify({ taskId: TASK_ID })
	});
	return POST(request);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('POST /api/timer/start', () => {
	it("answers a start Gauzy refuses with Gauzy's 403 and body", async () => {
		const refusal = { statusCode: 403, message: 'Time tracking is turned off for you in this team.' };
		const gauzyAnswer = Response.json(refusal, { status: 403 });
		global.fetch = jest.fn().mockResolvedValue(gauzyAnswer);

		const response = await startTimer();

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('answers a 502 when Gauzy cannot be reached', async () => {
		const networkFailure = new TypeError('fetch failed');
		global.fetch = jest.fn().mockRejectedValue(networkFailure);

		const response = await startTimer();

		expect(response.status).toBe(502);
	});
});
