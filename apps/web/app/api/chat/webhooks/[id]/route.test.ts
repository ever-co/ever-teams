/**
 * Proxy mode: a webhook's changes (PATCH), its revocation (DELETE) and a new signing secret (POST /secret) go on to
 * Gauzy with the session; Gauzy's answer comes back as it is, marked `no-store` (a new secret is shown once).
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { DELETE, PATCH } from './route';
import { POST as ROTATE } from './secret/route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/chat/webhooks/w-1';
const WEBHOOK = {
	id: 'w-1',
	conversationId: 'c-1',
	name: 'Ops alerts',
	tokenHint: 'ab12',
	hasSigningSecret: true,
	canBroadcast: true
};

describe('/api/chat/webhooks/:id', () => {
	it("changes a webhook through Gauzy's PATCH /chat/webhooks/:id, with the fields as sent", async () => {
		const fetchMock = gauzyAnswers(Response.json({ webhook: WEBHOOK }, { status: 200 }));
		const body = { name: 'Ops alerts', interactionUrl: null, canBroadcast: true };

		const response = await PATCH(signedInRequest(URL, 'PATCH', body), idParams('w-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/webhooks/w-1'));
		expect(sent.method).toBe('PATCH');
		expect(sent.body).toEqual(body);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({ webhook: WEBHOOK });
	});

	it('revokes through DELETE, with no body', async () => {
		const fetchMock = gauzyAnswers(
			Response.json({ webhook: { ...WEBHOOK, revokedAt: '2026-11-13T09:00:00.000Z' } }, { status: 200 })
		);

		const response = await DELETE(signedInRequest(URL, 'DELETE'), idParams('w-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/webhooks/w-1'));
		expect(sent.method).toBe('DELETE');
		expect(sent.body).toBeUndefined();
		expect(response.status).toBe(200);
	});

	it('asks a new signing secret through POST /chat/webhooks/:id/secret, answered no-store', async () => {
		const fetchMock = gauzyAnswers(
			Response.json({ webhook: WEBHOOK, signingSecret: 'signing-secret-2' }, { status: 200 })
		);

		const response = await ROTATE(signedInRequest(`${URL}/secret`, 'POST', {}), idParams('w-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/webhooks/w-1/secret'));
		expect(sent.method).toBe('POST');
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({ webhook: WEBHOOK, signingSecret: 'signing-secret-2' });
	});

	it.each([
		[404, 'The requested record was not found'],
		[403, 'Only a manager of this conversation can do that.'],
		[422, 'An icon URL must be https on a public host.']
	])("answers Gauzy's %i as it is", async (status, message) => {
		gauzyAnswers(Response.json({ statusCode: status, message }, { status }));

		const response = await PATCH(signedInRequest(URL, 'PATCH', { iconUrl: 'http://x' }), idParams('w-1'));

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual({ statusCode: status, message });
	});

	it('keeps the id one path segment', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));

		await ROTATE(signedInRequest(`${URL}/secret`, 'POST', {}), idParams('../../x'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/chat/webhooks/..%2F..%2Fx/secret'));
	});

	it('refuses a body that is not JSON, which another site could post with the session cookie', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));
		const headers = new Headers(signedInRequest(URL).headers);
		headers.set('content-type', 'application/x-www-form-urlencoded');

		const response = await DELETE(new Request(URL, { method: 'DELETE', headers, body: 'a=1' }), idParams('w-1'));

		expect(response.status).toBe(415);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
