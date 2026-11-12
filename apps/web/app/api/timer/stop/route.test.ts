/**
 * POST /api/timer/stop is the proxy-mode twin of Gauzy's POST /timesheet/timer/stop. It forwards the notes the member
 * changed while the timer ran, and nothing about notes for a stop that names none.
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
