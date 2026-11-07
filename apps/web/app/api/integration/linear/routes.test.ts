/**
 * Proxy mode: the Linear integration's routes hand each call on to the platform as it is (path, query, body), so
 * the settings page works the same way on both transports.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as getStatus } from './status/route';
import { POST as postState } from './install/state/route';
import { DELETE as deleteConnection } from './[id]/route';
import { POST as postMapping } from './[id]/mappings/route';
import { PUT as putMapping } from './[id]/mappings/[mappingId]/route';
import { POST as postImport } from './[id]/mappings/[mappingId]/import/route';
import { GET as getRuns } from './[id]/runs/route';

afterEach(restoreFetch);

const idParams = (id: string, mappingId?: string) => ({ params: Promise.resolve({ id, mappingId: mappingId as string }) });

describe('the Linear integration proxies', () => {
	it('reads the status with the organization in the query', async () => {
		const fetchMock = gauzyAnswers(Response.json({ configured: true, connection: null }, { status: 200 }));
		const response = await getStatus(signedInRequest('https://app.ever.team/api/integration/linear/status?organizationId=org-1'));
		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/integration/linear/status?organizationId=org-1'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
	});

	it('starts the connect flow with the organization in the body', async () => {
		const fetchMock = gauzyAnswers(Response.json({ state: 'abc', authorizeUrl: 'https://linear.app/oauth/authorize' }, { status: 200 }));
		await postState(signedInRequest('https://app.ever.team/api/integration/linear/install/state', 'POST', { organizationId: 'org-1' }));
		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/integration/linear/install/state'));
		expect(sent.body).toEqual({ organizationId: 'org-1' });
	});

	it('creates, changes and imports a mapping under the connection, each id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'm-1' }, { status: 201 }));
		await postMapping(signedInRequest('https://app.ever.team/api/integration/linear/int-1/mappings', 'POST', { linearTeamId: 't', projectId: 'p' }), idParams('int-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/linear/int-1/mappings'), method: 'POST', body: { linearTeamId: 't', projectId: 'p' } });

		fetchMock = gauzyAnswers(Response.json({ id: 'm-1', direction: 'both' }, { status: 200 }));
		await putMapping(signedInRequest('https://app.ever.team/api/integration/linear/int-1/mappings/m-1', 'PUT', { direction: 'both' }), idParams('int-1', '../m-1'));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/linear/int-1/mappings/..%2Fm-1'));

		fetchMock = gauzyAnswers(Response.json({ accepted: true, run: { id: 'r-1' } }, { status: 202 }));
		const response = await postImport(signedInRequest('https://app.ever.team/api/integration/linear/int-1/mappings/m-1/import', 'POST', { full: true }), idParams('int-1', 'm-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/linear/int-1/mappings/m-1/import'), method: 'POST', body: { full: true } });
		expect(response.status).toBe(202);
	});

	it('lists the runs with the page size, and removes a connection', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getRuns(signedInRequest('https://app.ever.team/api/integration/linear/int-1/runs?take=20'), idParams('int-1'));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/linear/int-1/runs?take=20'));

		fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const response = await deleteConnection(signedInRequest('https://app.ever.team/api/integration/linear/int-1', 'DELETE'), idParams('int-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/linear/int-1'), method: 'DELETE' });
		expect(response.status).toBe(204);
	});
});
