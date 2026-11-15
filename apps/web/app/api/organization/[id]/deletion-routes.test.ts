/**
 * Proxy mode twins of the routes the workspace danger zone calls (ever-co/ever-teams#5207): the counts its
 * confirmation shows, and the soft delete. Each first reads the session's own role permissions and is refused here,
 * before Gauzy is asked, when the role does not hold ALL_ORG_EDIT, which Gauzy guards both routes with.
 */
import { gauzyUrl, idParams, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as countContents } from './counts/route';
import { DELETE as softDelete } from './soft/route';

const ORIGIN = 'https://app.ever.team';

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

const COUNTS = { teams: 2, projects: 3, members: 4, trackedSeconds: 7200, invoices: 5, estimates: 1 };

afterEach(restoreFetch);

describe('GET /api/organization/:id/counts', () => {
	it('forwards the counts for a role holding ALL_ORG_EDIT', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ALL_ORG_EDIT'])), jsonAnswer(COUNTS));

		const response = await countContents(
			signedInRequest(`${ORIGIN}/api/organization/org-1/counts`),
			idParams('org-1')
		);

		expect(callOf(fetchMock, 0).url).toBe(gauzyUrl('/role-permissions/me'));
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization/org-1/counts'));
		expect(callOf(fetchMock, 1).method).toBe('GET');
		await expect(response.json()).resolves.toEqual(COUNTS);
	});

	it('refuses a role without ALL_ORG_EDIT and never asks Gauzy for the counts', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ALL_ORG_VIEW'])));

		const response = await countContents(
			signedInRequest(`${ORIGIN}/api/organization/org-1/counts`),
			idParams('org-1')
		);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('keeps an id with a slash as one path segment', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ALL_ORG_EDIT'])), jsonAnswer(COUNTS));

		await countContents(signedInRequest(`${ORIGIN}/api/organization/x/counts`), idParams('../user'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization/..%2Fuser/counts'));
	});
});

describe('DELETE /api/organization/:id/soft', () => {
	it('soft deletes the organization for a role holding ALL_ORG_EDIT, query included', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['ALL_ORG_EDIT'])),
			jsonAnswer({ id: 'org-1', deletedAt: '2026-11-15T00:00:00.000Z' }, 202)
		);

		const request = signedInRequest(`${ORIGIN}/api/organization/org-1/soft?tenantId=tenant-1`, 'DELETE');
		const response = await softDelete(request, idParams('org-1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization/org-1/soft?tenantId=tenant-1'));
		expect(callOf(fetchMock, 1).method).toBe('DELETE');
		expect(response.status).toBe(202);
	});

	it('refuses a role without ALL_ORG_EDIT before Gauzy deletes anything', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_TEAM_EDIT'])));

		const request = signedInRequest(`${ORIGIN}/api/organization/org-1/soft`, 'DELETE');
		const response = await softDelete(request, idParams('org-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("answers Gauzy's refusal of the last organization as it is", async () => {
		const refusal = { statusCode: 409, code: 'ORGANIZATION_LAST_OF_WORKSPACE', message: 'The last organization' };
		gauzyAnswersInOrder(jsonAnswer(permissionRows(['ALL_ORG_EDIT'])), jsonAnswer(refusal, 409));

		const request = signedInRequest(`${ORIGIN}/api/organization/org-1/soft`, 'DELETE');
		const response = await softDelete(request, idParams('org-1'));

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({ code: 'ORGANIZATION_LAST_OF_WORKSPACE' });
	});
});
