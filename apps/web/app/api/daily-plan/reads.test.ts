/**
 * Proxy mode: the four plan reads (the team's plans, my plans, a person's plans, a task's plans) reach Gauzy with the
 * session's tenant in the tenant-id header. Gauzy's tenant check refuses a read that names its tenant neither in that
 * header nor in a top-level `tenantId` query, and `where[tenantId]` does not count (ever-co/ever-teams#5611).
 */
import { NextRequest } from 'next/server';
import { signedIn } from '@/test/auth/guard-answers';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET as getTeamPlans } from './route';
import { GET as getMyPlans } from './me/route';
import { GET as getEmployeePlans } from './employee/[employeeId]/route';
import { GET as getTaskPlans } from './task/[taskId]/route';

const APP_URL = 'https://app.ever.team/api';
const PLANS = { items: [], total: 0 };

const READS: Array<[string, string, () => Promise<Response | undefined>]> = [
	['the team plans', '/daily-plan', () => getTeamPlans(new NextRequest(`${APP_URL}/daily-plan`))],
	['my plans', '/daily-plan/me', () => getMyPlans(new Request(`${APP_URL}/daily-plan/me?shape=lean`))],
	[
		"a person's plans",
		'/daily-plan/employee/employee-1',
		() =>
			getEmployeePlans(new Request(`${APP_URL}/daily-plan/employee/employee-1?shape=lean`), {
				params: Promise.resolve({ employeeId: 'employee-1' })
			})
	],
	[
		"a task's plans",
		'/daily-plan/task/task-1',
		() =>
			getTaskPlans(new Request(`${APP_URL}/daily-plan/task/task-1`), {
				params: Promise.resolve({ taskId: 'task-1' })
			})
	]
];

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function gauzyAnswers(answer: () => Promise<Response>) {
	fetchMock = jest.fn(answer);
	global.fetch = fetchMock;
}

/** The path and the headers of the call made to Gauzy. */
function upstreamCall() {
	const [rawUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
	const url = new URL(rawUrl);
	const headers = init?.headers as Record<string, string> | undefined;
	return { pathname: url.pathname, headers };
}

beforeEach(() => {
	const guardAnswer = signedIn({ id: 'user-1' });
	mockAuthenticatedGuard.mockResolvedValue(guardAnswer);
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe.each(READS)('GET %s', (_name, gauzyPath, read) => {
	it("sends the session's tenant in the tenant-id header", async () => {
		gauzyAnswers(async () => Response.json(PLANS));

		const response = await read();

		expect(response?.status).toBe(200);
		expect(await response?.json()).toEqual(PLANS);
		const upstream = upstreamCall();
		expect(upstream.pathname).toMatch(new RegExp(`${gauzyPath}$`));
		expect(upstream.headers?.['tenant-id']).toBe('cookie-tenant');
	});
});
