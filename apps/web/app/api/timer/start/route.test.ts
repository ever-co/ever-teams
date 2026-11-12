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
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const originalFetch = global.fetch;

function startTimerWith(body: unknown) {
	const request = new Request('https://app.ever.team/api/timer/start', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return POST(request);
}

function startTimer() {
	return startTimerWith({ taskId: TASK_ID });
}

/** The body the route sent to Gauzy's POST /timesheet/timer/start. */
function sentStartBody(fetchMock: jest.Mock) {
	const startCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/timesheet/timer/start'));
	return JSON.parse(String(startCall?.[1]?.body));
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

describe('POST /api/timer/start body sent to Gauzy', () => {
	let fetchMock: jest.Mock;

	beforeEach(() => {
		// A fresh answer per call: the start, then the status read
		fetchMock = jest.fn().mockImplementation(() => Promise.resolve(Response.json({ running: true })));
		global.fetch = fetchMock;
	});

	it("forwards the task's project and the billable value", async () => {
		const response = await startTimerWith({ taskId: TASK_ID, projectId: PROJECT_ID, isBillable: true });

		expect(response.status).toBe(200);
		expect(sentStartBody(fetchMock)).toEqual(
			expect.objectContaining({ taskId: TASK_ID, projectId: PROJECT_ID, isBillable: true })
		);
	});

	it('sends no project and a non-billable start for a body that names neither', async () => {
		await startTimerWith({ taskId: TASK_ID });

		const sentBody = sentStartBody(fetchMock);
		expect(sentBody).not.toHaveProperty('projectId');
		expect(sentBody.isBillable).toBe(false);
	});

	it("sends no project when the task comes from the cookie, which may name another task's project", async () => {
		await startTimerWith({ projectId: PROJECT_ID });

		expect(sentStartBody(fetchMock)).not.toHaveProperty('projectId');
	});

	it('forwards the notes of the entry', async () => {
		await startTimerWith({ taskId: TASK_ID, description: 'Fix the login page' });

		expect(sentStartBody(fetchMock).description).toBe('Fix the login page');
	});

	it('sends no notes for a body without any, as before notes existed', async () => {
		await startTimerWith({ taskId: TASK_ID });

		expect(sentStartBody(fetchMock)).not.toHaveProperty('description');
	});

	it.each([
		['a billable value that is not a boolean', { taskId: TASK_ID, isBillable: 'yes' }],
		['an empty project', { taskId: TASK_ID, projectId: '' }],
		['notes that are not text', { taskId: TASK_ID, description: 42 }],
		['notes longer than an entry takes', { taskId: TASK_ID, description: 'a'.repeat(1001) }]
	])('refuses %s with a 400, without calling Gauzy', async (_, body) => {
		const response = await startTimerWith(body);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
