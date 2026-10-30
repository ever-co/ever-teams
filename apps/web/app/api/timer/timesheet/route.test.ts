/**
 * GET /api/timer/timesheet is the proxy-mode twin of Gauzy's GET /timesheet/activity, read by the Timesheet card of
 * the task page. The client sends the task as taskIds[0], which the route dropped, so Gauzy was asked for the
 * activities of every task.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { signedIn } from '@/test/auth/guard-answers';
import { GET } from './route';

// The route reads the tenant and the organization from the guard's answer, not from the query
const SESSION = signedIn({ id: 'user-1' });

let fetchMock: jest.SpyInstance;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SESSION);
	const noActivities = Response.json([]);
	fetchMock = jest.spyOn(globalThis, 'fetch');
	fetchMock.mockResolvedValue(noActivities);
});

afterEach(() => {
	fetchMock.mockRestore();
});

/** The URL Gauzy was asked with. */
const upstreamUrl = () => new URL(String(fetchMock.mock.calls[0][0]));

/** The query Gauzy was asked with. */
const upstreamQuery = () => Object.fromEntries(upstreamUrl().searchParams);

describe('GET /api/timer/timesheet', () => {
	it('asks Gauzy for the activities of the task the client sends', async () => {
		// The query ActivityService.getActivities sends in proxy mode
		const query = new URLSearchParams({
			'taskIds[0]': 'task-1',
			tenantId: 'tenant-1',
			organizationId: 'organization-1'
		});

		const response = await GET(new Request(`https://app.ever.team/api/timer/timesheet?${query}`));

		expect(response.status).toBe(200);
		expect(upstreamUrl().pathname.endsWith('/timesheet/activity')).toBe(true);
		expect(upstreamQuery()).toEqual({
			'taskIds[0]': 'task-1',
			tenantId: SESSION.tenantId,
			organizationId: SESSION.organizationId,
			defaultRange: 'false'
		});
	});

	it('reads a plain taskId as well', async () => {
		await GET(new Request('https://app.ever.team/api/timer/timesheet?taskId=task-1'));

		expect(upstreamQuery()).toMatchObject({ 'taskIds[0]': 'task-1' });
	});

	it('sends no task when the client names none', async () => {
		await GET(new Request('https://app.ever.team/api/timer/timesheet'));

		expect(upstreamQuery()).toEqual({
			tenantId: SESSION.tenantId,
			organizationId: SESSION.organizationId,
			defaultRange: 'false'
		});
	});
});
