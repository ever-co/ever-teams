/**
 * GET /api/tasks/:id is the proxy-mode twin of Gauzy's GET /tasks/:id. Gauzy's own refusal (404 for a task that
 * does not exist) used to make the handler throw, so the browser got a 500 and the task page could not tell a
 * missing task from a failed load. It now gets Gauzy's status and body; a Gauzy it cannot reach still fails.
 */
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const originalFetch = global.fetch;

function getTask() {
	const request = new Request(`https://app.ever.team/api/tasks/${TASK_ID}`);
	const params = Promise.resolve({ id: TASK_ID });
	return GET(request, { params });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1' }));
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('GET /api/tasks/:id', () => {
	it("answers a task Gauzy does not find with Gauzy's 404 and body", async () => {
		const notFound = { statusCode: 404, message: 'Not Found' };
		const gauzyAnswer = Response.json(notFound, { status: 404 });
		global.fetch = jest.fn().mockResolvedValue(gauzyAnswer);

		const response = await getTask();

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(notFound);
	});

	it('still fails when Gauzy cannot be reached', async () => {
		const networkFailure = new TypeError('fetch failed');
		global.fetch = jest.fn().mockRejectedValue(networkFailure);

		await expect(getTask()).rejects.toThrow('fetch failed');
	});
});
