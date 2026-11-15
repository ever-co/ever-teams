/**
 * POST /api/timer/stop is the proxy-mode twin of Gauzy's POST /timesheet/timer/stop. It forwards the notes the member
 * changed while the timer ran, and nothing about notes for a stop that names none.
 *
 * It also forwards the time log a stop is for, when the stop names one, and Gauzy's refusal when another time log is
 * the running one: nothing was stopped then, which the app must not read as a failed request.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { POST } from './route';

const originalFetch = global.fetch;

function stopTimerWith(body: unknown) {
	const request = new Request('https://app.ever.team/api/timer/stop', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return POST(request);
}

/** The body the route sent to Gauzy's POST /timesheet/timer/stop. */
function sentStopBody(fetchMock: jest.Mock) {
	const stopCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/timesheet/timer/stop'));
	return JSON.parse(String(stopCall?.[1]?.body));
}

describe('POST /api/timer/stop notes sent to Gauzy', () => {
	let fetchMock: jest.Mock;

	beforeEach(() => {
		mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
		// A fresh answer per call: the stop, then the status read
		fetchMock = jest.fn().mockImplementation(() => Promise.resolve(Response.json({ running: false })));
		global.fetch = fetchMock;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it('forwards the notes changed during the run', async () => {
		const response = await stopTimerWith({ source: 'TEAMS', description: 'Fix the login page' });

		expect(response.status).toBe(200);
		expect(sentStopBody(fetchMock).description).toBe('Fix the login page');
	});

	it('forwards empty notes, which remove the notes of the entry', async () => {
		await stopTimerWith({ source: 'TEAMS', description: '' });

		expect(sentStopBody(fetchMock).description).toBe('');
	});

	it('sends no notes for a stop that names none, as before notes existed', async () => {
		await stopTimerWith({ source: 'TEAMS' });

		expect(sentStopBody(fetchMock)).not.toHaveProperty('description');
	});

	it.each([
		['notes that are not text', { source: 'TEAMS', description: 42 }],
		['notes longer than an entry takes', { source: 'TEAMS', description: 'a'.repeat(1001) }]
	])('refuses %s with a 400, without calling Gauzy', async (_, body) => {
		const response = await stopTimerWith(body);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('POST /api/timer/stop for the time log a stop names', () => {
	const TIME_LOG_ID = '9a1c3f0e-6f0b-4d53-9a43-1c1f6a2b7d10';
	let fetchMock: jest.Mock;

	/** Gauzy answers the stop with `stopAnswer`, and the status read that follows with a stopped timer. */
	function gauzyAnswersTheStopWith(stopAnswer: () => Response) {
		fetchMock = jest.fn().mockImplementation((url: unknown) => {
			const isStop = String(url).endsWith('/timesheet/timer/stop');
			return Promise.resolve(isStop ? stopAnswer() : Response.json({ running: false }));
		});
		global.fetch = fetchMock;
	}

	beforeEach(() => {
		mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
		gauzyAnswersTheStopWith(() => Response.json({ id: TIME_LOG_ID, isRunning: false }));
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it('forwards the time log the stop is for', async () => {
		const response = await stopTimerWith({ source: 'TEAMS', timeLogId: TIME_LOG_ID });

		expect(response.status).toBe(200);
		expect(sentStopBody(fetchMock).timeLogId).toBe(TIME_LOG_ID);
	});

	it('names no time log for a stop that names none, as before', async () => {
		await stopTimerWith({ source: 'TEAMS' });

		expect(sentStopBody(fetchMock)).not.toHaveProperty('timeLogId');
	});

	it.each([
		['an empty id', ''],
		['an id that is not text', 42]
	])(
		'refuses %s with a 400, without calling Gauzy: such a stop must never end whatever runs',
		async (_, timeLogId) => {
			const response = await stopTimerWith({ source: 'TEAMS', timeLogId });

			expect(response.status).toBe(400);
			expect(fetchMock).not.toHaveBeenCalled();
		}
	);

	it("answers Gauzy's 409 when another time log is the running one: nothing was stopped", async () => {
		const refusal = { statusCode: 409, message: 'This stop names a time log that is not the running one.' };
		gauzyAnswersTheStopWith(() => Response.json(refusal, { status: 409 }));

		const response = await stopTimerWith({ source: 'TEAMS', timeLogId: TIME_LOG_ID });

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual(refusal);
	});
});
