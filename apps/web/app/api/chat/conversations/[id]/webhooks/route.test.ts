/**
 * Proxy mode: a channel's incoming webhooks (list, create) go on to Gauzy with the session, and Gauzy's answer comes
 * back as it is, refusals included (404 where its webhooks are off, 403 to a member who does not manage the channel,
 * 409 / 400 past the limit), marked `no-store`: a create's answer holds the URL and signing secret, shown once.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { GET, POST } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/chat/conversations/c-1/webhooks';
const WEBHOOK = {
	id: 'w-1',
	conversationId: 'c-1',
	name: 'Alerts',
	tokenHint: 'ab12',
	hasSigningSecret: true,
	canBroadcast: false
};
const CREATED = {
	webhook: WEBHOOK,
	url: 'https://api.ever.team/api/chat/hooks/hook_url-secret',
	signingSecret: 'signing-secret-1'
};

describe('/api/chat/conversations/:id/webhooks', () => {
	it("lists through Gauzy's GET /chat/conversations/:id/webhooks", async () => {
		const fetchMock = gauzyAnswers(Response.json([WEBHOOK], { status: 200 }));

		const response = await GET(signedInRequest(URL), idParams('c-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/conversations/c-1/webhooks'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual([WEBHOOK]);
	});

	it('creates through POST with the body as sent, and answers the URL and signing secret marked no-store', async () => {
		const fetchMock = gauzyAnswers(Response.json(CREATED, { status: 201 }));
		const body = {
			name: 'Alerts',
			iconUrl: null,
			interactionUrl: 'https://hooks.example.com/click',
			canBroadcast: true
		};

		const response = await POST(signedInRequest(URL, 'POST', body), idParams('c-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/conversations/c-1/webhooks'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual(body);
		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual(CREATED);
	});

	it.each([
		[404, { statusCode: 404, message: 'The requested record was not found' }],
		[403, { statusCode: 403, message: 'Only a manager of this conversation can do that.' }],
		[400, { statusCode: 400, message: 'A channel has at most 10 webhooks; revoke one first.' }]
	])("answers Gauzy's %i as it is", async (status, refusal) => {
		gauzyAnswers(Response.json(refusal, { status }));

		const response = await POST(signedInRequest(URL, 'POST', { name: 'Alerts' }), idParams('c-1'));

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('keeps the id one path segment', async () => {
		const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));

		await GET(signedInRequest(URL), idParams('../x'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/chat/conversations/..%2Fx/webhooks'));
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json([], { status: 200 }));

		const response = await GET(new Request(URL), idParams('c-1'));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
