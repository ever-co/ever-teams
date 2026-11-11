/**
 * Proxy mode: the Trello integration's routes hand each call on to the platform as it is (path, query, body), so
 * the settings page works the same way on both transports.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as getStatus } from './status/route';
import { POST as postState } from './install/state/route';
import { POST as postConnect } from './connect/route';
import { DELETE as deleteConnection } from './[id]/route';
import { GET as getMetadata } from './[id]/metadata/route';
import { GET as getLists } from './[id]/boards/[boardId]/lists/route';
import { POST as postMapping } from './[id]/mappings/route';
import { PUT as putMapping } from './[id]/mappings/[mappingId]/route';
import { POST as postWebhook } from './[id]/mappings/[mappingId]/webhook/route';
import { POST as postImport } from './[id]/mappings/[mappingId]/import/route';
import { GET as getRuns } from './[id]/runs/route';
import { GET as getConflicts } from './[id]/conflicts/route';
import { POST as postResolve } from './[id]/conflicts/[conflictId]/resolve/route';

afterEach(restoreFetch);

const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

describe('the Trello integration proxies', () => {
	it('reads the status with the organization in the query, starts the connect flow, and finishes it with the token', async () => {
		let fetchMock = gauzyAnswers(Response.json({ configured: true, webhooks: true, connection: null }, { status: 200 }));
		const response = await getStatus(signedInRequest('https://app.ever.team/api/integration/trello/status?organizationId=org-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/status?organizationId=org-1'), method: 'GET' });
		expect(response.status).toBe(200);

		fetchMock = gauzyAnswers(Response.json({ state: 'abc', authorizeUrl: 'https://trello.com/1/authorize' }, { status: 200 }));
		await postState(signedInRequest('https://app.ever.team/api/integration/trello/install/state', 'POST', { organizationId: 'org-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/install/state'), body: { organizationId: 'org-1' } });

		fetchMock = gauzyAnswers(Response.json({ id: 'int-1' }, { status: 200 }));
		await postConnect(signedInRequest('https://app.ever.team/api/integration/trello/connect', 'POST', { organizationId: 'org-1', token: 'tok', state: 'abc' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/connect'), method: 'POST', body: { organizationId: 'org-1', token: 'tok', state: 'abc' } });
	});

	it('reads the metadata and a board lists, each id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json({ member: {}, boards: [] }, { status: 200 }));
		await getMetadata(signedInRequest('https://app.ever.team/api/integration/trello/int-1/metadata'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/trello/int-1/metadata'));

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getLists(signedInRequest('https://app.ever.team/api/integration/trello/int-1/boards/b-1/lists'), params({ id: 'int-1', boardId: '../b-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/trello/int-1/boards/..%2Fb-1/lists'));
	});

	it('creates, changes, re-registers the webhook of and imports a mapping under the connection', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'm-1' }, { status: 201 }));
		await postMapping(signedInRequest('https://app.ever.team/api/integration/trello/int-1/mappings', 'POST', { trelloBoardId: 'b', projectId: 'q' }), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1/mappings'), method: 'POST', body: { trelloBoardId: 'b', projectId: 'q' } });

		fetchMock = gauzyAnswers(Response.json({ id: 'm-1', direction: 'both' }, { status: 200 }));
		await putMapping(signedInRequest('https://app.ever.team/api/integration/trello/int-1/mappings/m-1', 'PUT', { direction: 'both' }), params({ id: 'int-1', mappingId: '../m-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/trello/int-1/mappings/..%2Fm-1'));

		fetchMock = gauzyAnswers(Response.json({ accepted: true }, { status: 202 }));
		await postWebhook(signedInRequest('https://app.ever.team/api/integration/trello/int-1/mappings/m-1/webhook', 'POST', {}), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1/mappings/m-1/webhook'), method: 'POST' });

		fetchMock = gauzyAnswers(Response.json({ accepted: true, run: { id: 'r-1' } }, { status: 202 }));
		const response = await postImport(signedInRequest('https://app.ever.team/api/integration/trello/int-1/mappings/m-1/import', 'POST', { full: true }), params({ id: 'int-1', mappingId: 'm-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1/mappings/m-1/import'), method: 'POST', body: { full: true } });
		expect(response.status).toBe(202);
	});

	it('lists the runs with the page size, and removes a connection', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getRuns(signedInRequest('https://app.ever.team/api/integration/trello/int-1/runs?take=20'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/integration/trello/int-1/runs?take=20'));

		fetchMock = gauzyAnswers(new Response(null, { status: 204 }));
		const response = await deleteConnection(signedInRequest('https://app.ever.team/api/integration/trello/int-1', 'DELETE'), params({ id: 'int-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1'), method: 'DELETE' });
		expect(response.status).toBe(204);
	});

	it('lists the sync conflicts with their filters, and resolves one, each id kept to one segment', async () => {
		const conflictParams = (id: string, conflictId: string) => ({ params: Promise.resolve({ id, conflictId }) });
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getConflicts(signedInRequest('https://app.ever.team/api/integration/trello/int-1/conflicts?status=resolved&runId=r-1'), { params: Promise.resolve({ id: 'int-1' }) });
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1/conflicts?status=resolved&runId=r-1'), method: 'GET' });

		fetchMock = gauzyAnswers(Response.json({ id: 'c-1', status: 'resolved', resolution: 'kept_platform' }, { status: 200 }));
		const response = await postResolve(
			signedInRequest('https://app.ever.team/api/integration/trello/int-1/conflicts/c-1/resolve', 'POST', { keep: 'platform' }),
			conflictParams('int-1', '../c-1')
		);
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/integration/trello/int-1/conflicts/..%2Fc-1/resolve'), method: 'POST', body: { keep: 'platform' } });
		expect(response.status).toBe(200);

		// The platform's refusal (the task changed since) reaches the page as it was answered.
		fetchMock = gauzyAnswers(Response.json({ message: 'Stale', code: 'TRELLO_CONFLICT_STALE' }, { status: 409 }));
		const refused = await postResolve(signedInRequest('https://app.ever.team/api/integration/trello/int-1/conflicts/c-1/resolve', 'POST', { keep: 'platform' }), conflictParams('int-1', 'c-1'));
		expect(refused.status).toBe(409);
	});
});
