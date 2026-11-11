/**
 * Proxy mode: the task automations routes hand each call on to the platform as it is (path, query, body), so Settings →
 * Automations works the same way on both transports, and an id is kept to one path segment.
 */
import { gauzyAnswers, gauzyUrl, idParams, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as listRules, POST as createRule } from './route';
import { GET as getTemplates } from './templates/route';
import { PUT as putOrder } from './order/route';
import { DELETE as deleteRule, GET as getRule, PUT as putRule } from './[id]/route';
import { POST as postTest } from './[id]/test/route';
import { GET as getRuns } from './[id]/runs/route';

afterEach(restoreFetch);

const APP = 'https://app.ever.team/api/task-automations';

describe('the task automations proxies', () => {
	it('lists the rules and the templates with the organization in the query', async () => {
		let fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await listRules(signedInRequest(`${APP}?organizationId=org-1`));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/task-automations?organizationId=org-1'), method: 'GET' });

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getTemplates(signedInRequest(`${APP}/templates?organizationId=org-1`));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/task-automations/templates?organizationId=org-1'));
	});

	it('creates a rule and puts the rules in order with the body as it is', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'rule-1' }, { status: 201 }));
		const created = await createRule(signedInRequest(APP, 'POST', { templateKey: 'close-parent-when-subtasks-done', organizationId: 'org-1' }));
		expect(sentToGauzy(fetchMock)).toMatchObject({
			url: gauzyUrl('/task-automations'),
			method: 'POST',
			body: { templateKey: 'close-parent-when-subtasks-done', organizationId: 'org-1' }
		});
		expect(created.status).toBe(201);

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await putOrder(signedInRequest(`${APP}/order`, 'PUT', { ids: ['b', 'a'] }));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/task-automations/order'), method: 'PUT', body: { ids: ['b', 'a'] } });
	});

	it('reads, edits and deletes one rule, its id kept to one segment', async () => {
		let fetchMock = gauzyAnswers(Response.json({ id: 'rule-1' }, { status: 200 }));
		await getRule(signedInRequest(`${APP}/rule-1`), idParams('rule-1'));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/task-automations/rule-1'));

		fetchMock = gauzyAnswers(Response.json({ id: 'x' }, { status: 200 }));
		await putRule(signedInRequest(`${APP}/x`, 'PUT', { isEnabled: false }), idParams('../templates'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/task-automations/..%2Ftemplates'), method: 'PUT', body: { isEnabled: false } });

		fetchMock = gauzyAnswers(Response.json({ id: 'rule-1', deleted: true }, { status: 200 }));
		await deleteRule(signedInRequest(`${APP}/rule-1?organizationId=org-1`, 'DELETE'), idParams('rule-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/task-automations/rule-1?organizationId=org-1'), method: 'DELETE' });
	});

	it('runs the dry run and reads the run history', async () => {
		let fetchMock = gauzyAnswers(Response.json({ outcome: 'APPLIED' }, { status: 200 }));
		await postTest(signedInRequest(`${APP}/rule-1/test`, 'POST', { taskId: 'task-1' }), idParams('rule-1'));
		expect(sentToGauzy(fetchMock)).toMatchObject({ url: gauzyUrl('/task-automations/rule-1/test'), method: 'POST', body: { taskId: 'task-1' } });

		fetchMock = gauzyAnswers(Response.json([], { status: 200 }));
		await getRuns(signedInRequest(`${APP}/rule-1/runs?limit=20`), idParams('rule-1'));
		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/task-automations/rule-1/runs?limit=20'));
	});

	it('answers with the platform’s own status, so a 404 tells the page the feature is not there', async () => {
		gauzyAnswers(Response.json({ statusCode: 404, message: 'Not Found' }, { status: 404 }));
		const response = await getTemplates(signedInRequest(`${APP}/templates`));
		expect(response.status).toBe(404);
	});
});
