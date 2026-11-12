/**
 * Proxy mode: the Jira integration's routes hand each call on to the platform as it is (path, query, body), so the
 * settings page works the same way on both transports.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as getStatus } from './status/route';
import { POST as postState } from './install/state/route';
import { DELETE as deleteConnection, GET as getConnection } from './[id]/route';
import { GET as getSites } from './[id]/sites/route';
import { PUT as putSite } from './[id]/site/route';
import { GET as getProjects } from './[id]/projects/route';
import { GET as getProject } from './[id]/projects/[projectId]/route';
import { GET as getMappings, POST as postMapping } from './[id]/mappings/route';
import { DELETE as deleteMapping, PUT as putMapping } from './[id]/mappings/[mappingId]/route';
import { POST as postImport } from './[id]/mappings/[mappingId]/import/route';
import { POST as postWebhook } from './[id]/webhook/route';
import { GET as getRuns } from './[id]/runs/route';
import { GET as getConflicts } from './[id]/conflicts/route';
import { POST as postResolve } from './[id]/conflicts/[conflictId]/resolve/route';

afterEach(restoreFetch);

const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

describe('the Jira integration proxies', () => {
	it('reads the status with the organization in the query, and starts the connect flow', async () => {
		let fetchMock = gauzyAnswers(Response.json({ configured: true, webhooks: true, defaultStatusMap: {}, connection: null }, { status: 200 }));
		const response = await getStatus(signedInRequest('https://app.ever.team/api/integration/jira/status?organizationId=org-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/status?organizationId=org-1'), method: 'GET' });
		expect(response.status).toBe(200);

		fetchMock = gauzyAnswers(Response.json({ state: 'abc', authorizeUrl: 'https://auth.atlassian.com/authorize' }, { status: 200 }));
		await postState(signedInRequest('https://app.ever.team/api/integration/jira/install/state', 'POST', { organizationId: 'org-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/install/state'), body: { organizationId: 'org-1' } });
	});

	it('reads a connection, its sites, and chooses one, each id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'int-1' }, { status: 200 }));
		await getConnection(signedInRequest('https://app.ever.team/api/integration/jira/int-1'), params({ id: '../int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/..%2Fint-1'), method: 'GET' });

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getSites(signedInRequest('https://app.ever.team/api/integration/jira/int-1/sites'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/jira/int-1/sites'));

		fetchMock = gauzyAnswers(Response.json({ id: 'int-1', cloudId: 'cloud-1' }, { status: 200 }));
		await putSite(signedInRequest('https://app.ever.team/api/integration/jira/int-1/site', 'PUT', { cloudId: 'cloud-1' }), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/site'), method: 'PUT', body: { cloudId: 'cloud-1' } });
	});

	it('reads the site projects and one project with its statuses and issue types', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getProjects(signedInRequest('https://app.ever.team/api/integration/jira/int-1/projects'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/jira/int-1/projects'));

		fetchMock = gauzyAnswers(Response.json({ project: {}, issueTypes: [], statuses: [] }, { status: 200 }));
		await getProject(signedInRequest('https://app.ever.team/api/integration/jira/int-1/projects/10000'), params({ id: 'int-1', projectId: '../10000' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/jira/int-1/projects/..%2F10000'));
	});

	it('lists, creates, changes, imports and removes a mapping under the connection', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getMappings(signedInRequest('https://app.ever.team/api/integration/jira/int-1/mappings'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/mappings'), method: 'GET' });

		fetchMock = gauzyAnswers(Response.json({ id: 'm-1' }, { status: 201 }));
		await postMapping(
			signedInRequest('https://app.ever.team/api/integration/jira/int-1/mappings', 'POST', { jiraProjectId: '10000', projectId: 'q', statusMap: { done: 'completed', 'status:3': 'in-review' } }),
			params({ id: 'int-1' })
		);
		expect(sentToGauzy(fetchMock)).toMatchObject({
			url: gauzyUrl('/integration/jira/int-1/mappings'),
			method: 'POST',
			body: { jiraProjectId: '10000', projectId: 'q', statusMap: { done: 'completed', 'status:3': 'in-review' } }
		});

		fetchMock = gauzyAnswers(Response.json({ id: 'm-1', direction: 'both' }, { status: 200 }));
		await putMapping(signedInRequest('https://app.ever.team/api/integration/jira/int-1/mappings/m-1', 'PUT', { direction: 'both' }), params({ id: 'int-1', mappingId: '../m-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/mappings/..%2Fm-1'), method: 'PUT', body: { direction: 'both' } });

		fetchMock = gauzyAnswers(Response.json({ accepted: true, run: { id: 'r-1' } }, { status: 202 }));
		const response = await postImport(signedInRequest('https://app.ever.team/api/integration/jira/int-1/mappings/m-1/import', 'POST', { full: true }), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/mappings/m-1/import'), method: 'POST', body: { full: true } });
		expect(response.status).toBe(202);

		fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const removed = await deleteMapping(signedInRequest('https://app.ever.team/api/integration/jira/int-1/mappings/m-1', 'DELETE'), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/mappings/m-1'), method: 'DELETE' });
		expect(removed.status).toBe(204);
	});

	it('registers the connection webhook again, lists the runs with the page size, and removes a connection', async () => {
		let fetchMock = gauzyAnswers(Response.json({ outcome: 'registered', connection: { id: 'int-1' } }, { status: 200 }));
		await postWebhook(signedInRequest('https://app.ever.team/api/integration/jira/int-1/webhook', 'POST', {}), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/webhook'), method: 'POST' });

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getRuns(signedInRequest('https://app.ever.team/api/integration/jira/int-1/runs?take=20'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/jira/int-1/runs?take=20'));

		fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const response = await deleteConnection(signedInRequest('https://app.ever.team/api/integration/jira/int-1', 'DELETE'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1'), method: 'DELETE' });
		expect(response.status).toBe(204);
	});

	it('lists the sync conflicts with their filters, and resolves one, each id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getConflicts(signedInRequest('https://app.ever.team/api/integration/jira/int-1/conflicts?status=resolved&runId=r-1'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/conflicts?status=resolved&runId=r-1'), method: 'GET' });

		fetchMock = gauzyAnswers(Response.json({ id: 'c-1', status: 'resolved', resolution: 'kept_platform' }, { status: 200 }));
		const response = await postResolve(
			signedInRequest('https://app.ever.team/api/integration/jira/int-1/conflicts/c-1/resolve', 'POST', { keep: 'platform' }),
			params({ id: 'int-1', conflictId: '../c-1' })
		);
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/jira/int-1/conflicts/..%2Fc-1/resolve'), method: 'POST', body: { keep: 'platform' } });
		expect(response.status).toBe(200);

		// The platform's refusal (the task changed since) reaches the page as it was answered.
		fetchMock = gauzyAnswers(Response.json({ message: 'Stale', code: 'JIRA_CONFLICT_STALE' }, { status: 409 }));
		const refused = await postResolve(signedInRequest('https://app.ever.team/api/integration/jira/int-1/conflicts/c-1/resolve', 'POST', { keep: 'platform' }), params({ id: 'int-1', conflictId: 'c-1' }));
		expect(refused.status).toBe(409);
	});
});
