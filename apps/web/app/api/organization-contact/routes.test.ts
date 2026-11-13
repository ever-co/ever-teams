/**
 * Proxy mode twins of Gauzy's client routes. The reads are forwarded as they come. Each write first reads the
 * session's own role permissions and is refused here, before Gauzy is asked to write, when the role holds none of
 * the permissions that write needs.
 */
import { gauzyUrl, idParams, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as listClients } from './pagination/route';
import { POST as createClient } from './route';
import { PUT as updateClient } from './[id]/route';
import { DELETE as archiveClient } from './[id]/soft/route';
import { PUT as restoreClient } from './[id]/recover/route';

const ORIGIN = 'https://app.ever.team';

const clientBody = { name: 'Acme', contactType: 'CLIENT', organizationId: 'org-1', tenantId: 'tenant-1' };

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ permission, enabled: true }));
}

/** Gauzy answers the permissions read first, then the forwarded write. */
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
	return { url, method: init.method, body: init.body };
}

afterEach(restoreFetch);

describe('GET /api/organization-contact/pagination', () => {
	it('forwards the page of clients asked for, query included', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer({ items: [], total: 0 }));
		const query = '?where%5BcontactType%5D=CLIENT&withDeleted=true&take=100&skip=1';
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/pagination${query}`);

		const response = await listClients(request);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(callOf(fetchMock, 0).url).toBe(gauzyUrl(`/organization-contact/pagination${query}`));
		expect(callOf(fetchMock, 0).method).toBe('GET');
		await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
	});
});

describe('POST /api/organization-contact', () => {
	it('creates the client for a role that may add contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['ORG_CONTACT_ADD'])),
			jsonAnswer({ id: 'c1', name: 'Acme' }, 201)
		);
		const request = signedInRequest(`${ORIGIN}/api/organization-contact`, 'POST', clientBody);

		const response = await createClient(request);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(callOf(fetchMock, 0).url).toBe(gauzyUrl('/role-permissions/me'));
		expect(callOf(fetchMock, 0).method).toBe('GET');
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization-contact'));
		expect(callOf(fetchMock, 1).method).toBe('POST');
		expect(JSON.parse(callOf(fetchMock, 1).body as string)).toEqual(clientBody);
		expect(response.status).toBe(201);
	});

	it('refuses a role that can only view contacts, without asking Gauzy to write', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_CONTACT_VIEW'])));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact`, 'POST', clientBody);

		const response = await createClient(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not count a permission the role holds switched off', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer([{ permission: 'ORG_CONTACT_EDIT', enabled: false }]));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact`, 'POST', clientBody);

		const response = await createClient(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('answers 401 without a session, and calls nothing', async () => {
		const fetchMock = gauzyAnswersInOrder();
		const request = new Request(`${ORIGIN}/api/organization-contact`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(clientBody)
		});

		const response = await createClient(request);

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('passes on the refusal of the permissions read, such as an expired session', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer({ statusCode: 401, message: 'Unauthorized' }, 401));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact`, 'POST', clientBody);

		const response = await createClient(request);

		expect(response.status).toBe(401);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('PUT /api/organization-contact/:id', () => {
	it('saves the client for a role that may edit contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['ORG_CONTACT_EDIT'])),
			jsonAnswer({ id: 'c1', name: 'Acme' }, 202)
		);
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1`, 'PUT', clientBody);

		const response = await updateClient(request, idParams('c1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization-contact/c1'));
		expect(callOf(fetchMock, 1).method).toBe('PUT');
		expect(response.status).toBe(202);
	});

	it('refuses a role that may only add or delete contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_CONTACT_ADD', 'ORG_CONTACT_DELETE'])));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1`, 'PUT', clientBody);

		const response = await updateClient(request, idParams('c1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('keeps an id that looks like a path inside its own segment', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_CONTACT_EDIT'])), jsonAnswer({}, 404));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/x`, 'PUT', clientBody);

		await updateClient(request, idParams('../employee'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization-contact/..%2Femployee'));
	});
});

describe('DELETE /api/organization-contact/:id/soft', () => {
	it('archives the client for a role that may delete contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['ORG_CONTACT_DELETE'])),
			jsonAnswer({ id: 'c1', deletedAt: '2026-11-12T08:00:00.000Z' }, 202)
		);
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1/soft?organizationId=org-1`, 'DELETE');

		const response = await archiveClient(request, idParams('c1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization-contact/c1/soft?organizationId=org-1'));
		expect(callOf(fetchMock, 1).method).toBe('DELETE');
		expect(response.status).toBe(202);
	});

	it('refuses a member who can only view contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_CONTACT_VIEW'])));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1/soft`, 'DELETE');

		const response = await archiveClient(request, idParams('c1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('PUT /api/organization-contact/:id/recover', () => {
	it('restores the client for a role that may edit contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['ORG_CONTACT_EDIT'])),
			jsonAnswer({ id: 'c1', deletedAt: null }, 202)
		);
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1/recover`, 'PUT', {});

		const response = await restoreClient(request, idParams('c1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/organization-contact/c1/recover'));
		expect(callOf(fetchMock, 1).method).toBe('PUT');
		expect(response.status).toBe(202);
	});

	it('refuses a member who can only add contacts', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(['ORG_CONTACT_ADD'])));
		const request = signedInRequest(`${ORIGIN}/api/organization-contact/c1/recover`, 'PUT', {});

		const response = await restoreClient(request, idParams('c1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
