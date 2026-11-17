/**
 * Proxy mode twins of Gauzy's billing schedule routes. Each one first reads the session's own role permissions: the
 * schedules are read by a role that reads invoices and client rates, and changed by one that may make invoices from
 * everyone's time, since a schedule makes such invoices on its own. A change must also come from this app's own pages.
 */
import { gauzyUrl, idParams, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { GET as listSchedules, POST as createSchedule } from './route';
import { DELETE as deleteSchedule, PUT as updateSchedule } from './[id]/route';
import { GET as listRuns } from './[id]/runs/route';

const ORIGIN = 'https://app.ever.team';

const ADMIN = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/** Edits invoices without reading everyone's time: a schedule would bill everyone's. */
const EDITOR = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT'];

/** What Gauzy grants its member role by default: invoices, and no client rate. */
const MEMBER = ['INVOICES_VIEW', 'INVOICES_EDIT', 'TIME_TRACKER', 'ORG_CONTACT_VIEW'];

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ permission, enabled: true }));
}

/** Gauzy answers the permissions read first, then the forwarded call. */
function gauzyAnswersInOrder(...answers: Response[]) {
	const fetchMock = jest.fn();
	for (const answer of answers) {
		fetchMock.mockResolvedValueOnce(answer);
	}
	global.fetch = fetchMock;
	return fetchMock;
}

function callOf(fetchMock: jest.Mock, index: number) {
	const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
	return { url, method: init.method };
}

afterEach(restoreFetch);

describe('GET /api/invoice-schedules', () => {
	it('forwards the list, with its query, to a role that reads invoices and client rates', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer([]));
		const query = '?organizationId=org-1&organizationContactId=client-1';

		const response = await listSchedules(signedInRequest(`${ORIGIN}/api/invoice-schedules${query}`));

		expect(callOf(fetchMock, 1)).toEqual({ url: gauzyUrl(`/invoice-schedules${query}`), method: 'GET' });
		await expect(response.json()).resolves.toEqual([]);
	});

	it('refuses a member, who reads no client rate, without asking for a schedule', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));

		const response = await listSchedules(signedInRequest(`${ORIGIN}/api/invoice-schedules`));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('POST /api/invoice-schedules', () => {
	const body = { organizationContactId: 'client-1', frequency: 'MONTHLY', startDay: '2026-10-01' };

	it('forwards a new schedule from a role that may make invoices from everyone’s time', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({ id: 'schedule-1' }, 201));

		const response = await createSchedule(signedInRequest(`${ORIGIN}/api/invoice-schedules`, 'POST', body));

		expect(callOf(fetchMock, 1)).toEqual({ url: gauzyUrl('/invoice-schedules'), method: 'POST' });
		expect(response.status).toBe(201);
	});

	it('refuses an editor who cannot read everyone’s time', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)));

		const response = await createSchedule(signedInRequest(`${ORIGIN}/api/invoice-schedules`, 'POST', body));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('PUT and DELETE /api/invoice-schedules/:id', () => {
	it('forwards a change and a delete to the schedule named, its id kept to one path segment', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(ADMIN)),
			jsonAnswer({ id: 'schedule-1' }),
			jsonAnswer(permissionRows(ADMIN)),
			jsonAnswer({})
		);
		const id = '../employee';

		await updateSchedule(
			signedInRequest(`${ORIGIN}/api/invoice-schedules/x?organizationId=org-1`, 'PUT', { paused: true }),
			idParams(id)
		);
		await deleteSchedule(
			signedInRequest(`${ORIGIN}/api/invoice-schedules/x?organizationId=org-1`, 'DELETE'),
			idParams(id)
		);

		expect(callOf(fetchMock, 1)).toEqual({
			url: gauzyUrl('/invoice-schedules/..%2Femployee?organizationId=org-1'),
			method: 'PUT'
		});
		expect(callOf(fetchMock, 3)).toEqual({
			url: gauzyUrl('/invoice-schedules/..%2Femployee?organizationId=org-1'),
			method: 'DELETE'
		});
	});

	it('refuses a change from an editor who cannot read everyone’s time', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)));

		const response = await updateSchedule(
			signedInRequest(`${ORIGIN}/api/invoice-schedules/schedule-1`, 'PUT', { paused: true }),
			idParams('schedule-1')
		);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('GET /api/invoice-schedules/:id/runs', () => {
	it('forwards the runs of the schedule named to a role that reads invoices and client rates', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer([]));

		await listRuns(
			signedInRequest(`${ORIGIN}/api/invoice-schedules/schedule-1/runs?organizationId=org-1&take=12`),
			idParams('schedule-1')
		);

		expect(callOf(fetchMock, 1).url).toBe(
			gauzyUrl('/invoice-schedules/schedule-1/runs?organizationId=org-1&take=12')
		);
	});
});

describe('a schedule changed from another page than this app’s', () => {
	const changes = [
		['POST /api/invoice-schedules', 'POST', (req: Request) => createSchedule(req)],
		['PUT /api/invoice-schedules/:id', 'PUT', (req: Request) => updateSchedule(req, idParams('schedule-1'))],
		['DELETE /api/invoice-schedules/:id', 'DELETE', (req: Request) => deleteSchedule(req, idParams('schedule-1'))]
	] as const;

	describe.each(changes)('%s', (_route, method, send) => {
		const url = `${ORIGIN}/api/invoice-schedules${method === 'POST' ? '' : '/schedule-1'}`;
		const body = method === 'DELETE' ? undefined : { paused: true };

		it.each(FOREIGN_ORIGIN_HEADERS)(
			'is refused from %s, before Gauzy is asked anything',
			async (_label, headers) => {
				const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({}));

				const response = await send(signedInRequest(url, method, body, headers));

				expect(response.status).toBe(403);
				await expect(response.json()).resolves.toMatchObject({ statusCode: 403 });
				expect(fetchMock).not.toHaveBeenCalled();
			}
		);

		it('reaches Gauzy from this app’s own pages', async () => {
			const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({ id: 'schedule-1' }));

			const response = await send(signedInRequest(url, method, body, SAME_ORIGIN_HEADERS));

			expect(response.status).toBe(200);
			expect(callOf(fetchMock, 1).method).toBe(method);
		});
	});
});
