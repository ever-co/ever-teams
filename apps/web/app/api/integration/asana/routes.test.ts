/**
 * Proxy mode: the Asana integration's routes hand each call on to the platform as it is (path, query, body), so
 * the settings page works the same way on both transports.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as getStatus } from './status/route';
import { POST as postState } from './install/state/route';
import { DELETE as deleteConnection } from './[id]/route';
import { GET as getMetadata } from './[id]/metadata/route';
import { GET as getProjects } from './[id]/workspaces/[workspaceGid]/projects/route';
import { GET as getSections } from './[id]/projects/[projectGid]/sections/route';
import { POST as postMapping } from './[id]/mappings/route';
import { PUT as putMapping } from './[id]/mappings/[mappingId]/route';
import { POST as postWebhook } from './[id]/mappings/[mappingId]/webhook/route';
import { POST as postImport } from './[id]/mappings/[mappingId]/import/route';
import { GET as getRuns } from './[id]/runs/route';

afterEach(restoreFetch);

const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

describe('the Asana integration proxies', () => {
	it('reads the status with the organization in the query, and starts the connect flow', async () => {
		let fetchMock = gauzyAnswers(Response.json({ configured: true, webhooks: true, connection: null }, { status: 200 }));
		const response = await getStatus(signedInRequest('https://app.ever.team/api/integration/asana/status?organizationId=org-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/status?organizationId=org-1'), method: 'GET' });
		expect(response.status).toBe(200);

		fetchMock = gauzyAnswers(Response.json({ state: 'abc', authorizeUrl: 'https://app.asana.com/-/oauth_authorize' }, { status: 200 }));
		await postState(signedInRequest('https://app.ever.team/api/integration/asana/install/state', 'POST', { organizationId: 'org-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/install/state'), body: { organizationId: 'org-1' } });
	});

	it('reads the metadata, a workspace projects and a project sections, each id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json({ user: {}, workspaces: [] }, { status: 200 }));
		await getMetadata(signedInRequest('https://app.ever.team/api/integration/asana/int-1/metadata'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/asana/int-1/metadata'));

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getProjects(signedInRequest('https://app.ever.team/api/integration/asana/int-1/workspaces/w-1/projects'), params({ id: 'int-1', workspaceGid: '../w-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/asana/int-1/workspaces/..%2Fw-1/projects'));

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getSections(signedInRequest('https://app.ever.team/api/integration/asana/int-1/projects/p-1/sections'), params({ id: 'int-1', projectGid: 'p-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/asana/int-1/projects/p-1/sections'));
	});

	it('creates, changes, re-registers the webhook of and imports a mapping under the connection', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'm-1' }, { status: 201 }));
		await postMapping(signedInRequest('https://app.ever.team/api/integration/asana/int-1/mappings', 'POST', { asanaProjectGid: 'p', projectId: 'q' }), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/int-1/mappings'), method: 'POST', body: { asanaProjectGid: 'p', projectId: 'q' } });

		fetchMock = gauzyAnswers(Response.json({ id: 'm-1', direction: 'both' }, { status: 200 }));
		await putMapping(signedInRequest('https://app.ever.team/api/integration/asana/int-1/mappings/m-1', 'PUT', { direction: 'both' }), params({ id: 'int-1', mappingId: '../m-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/asana/int-1/mappings/..%2Fm-1'));

		fetchMock = gauzyAnswers(Response.json({ accepted: true }, { status: 202 }));
		await postWebhook(signedInRequest('https://app.ever.team/api/integration/asana/int-1/mappings/m-1/webhook', 'POST', {}), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/int-1/mappings/m-1/webhook'), method: 'POST' });

		fetchMock = gauzyAnswers(Response.json({ accepted: true, run: { id: 'r-1' } }, { status: 202 }));
		const response = await postImport(signedInRequest('https://app.ever.team/api/integration/asana/int-1/mappings/m-1/import', 'POST', { full: true }), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/int-1/mappings/m-1/import'), method: 'POST', body: { full: true } });
		expect(response.status).toBe(202);
	});

	it('lists the runs with the page size, and removes a connection', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getRuns(signedInRequest('https://app.ever.team/api/integration/asana/int-1/runs?take=20'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/asana/int-1/runs?take=20'));

		fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const response = await deleteConnection(signedInRequest('https://app.ever.team/api/integration/asana/int-1', 'DELETE'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/asana/int-1'), method: 'DELETE' });
		expect(response.status).toBe(204);
	});
});
