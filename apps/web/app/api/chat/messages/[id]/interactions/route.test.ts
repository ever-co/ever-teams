/**
 * Proxy mode: a click on an app message's button goes on to Gauzy with its `Idempotency-Key`, as it does in direct
 * mode, so a click sent again (a retry after a lost answer) is the same click there and calls the app no second time.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { POST } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/chat/messages/message-1/interactions';
const ANSWER = {
	interaction: {
		interactionId: 'i-1',
		messageId: 'message-1',
		conversationId: 'c-1',
		actionId: 'ack',
		status: 'delivered',
		attempts: 1,
		replyApplied: false
	},
	events: []
};

/** A signed-in click, with extra request headers. */
function click(headers: Record<string, string>, body: unknown = { actionId: 'ack', blockId: 'alert-7' }): Request {
	const request = signedInRequest(URL, 'POST', body);
	const merged = new Headers(request.headers);
	for (const [name, value] of Object.entries(headers)) merged.set(name, value);
	return new Request(request, { headers: merged });
}

/** The headers the route sent to Gauzy. */
function headersSent(fetchMock: jest.Mock): Record<string, string> {
	return (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
}

describe('/api/chat/messages/:id/interactions', () => {
	it("forwards the click and its Idempotency-Key to Gauzy's POST /chat/messages/:id/interactions", async () => {
		const fetchMock = gauzyAnswers(Response.json(ANSWER, { status: 200 }));

		const response = await POST(click({ 'Idempotency-Key': 'click-key-1' }), idParams('message-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/chat/messages/message-1/interactions'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual({ actionId: 'ack', blockId: 'alert-7' });
		expect(headersSent(fetchMock)['idempotency-key']).toBe('click-key-1');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(ANSWER);
	});

	it('sends no key when the browser sent none (an older client)', async () => {
		const fetchMock = gauzyAnswers(Response.json(ANSWER, { status: 200 }));

		await POST(click({}), idParams('message-1'));

		sentToGauzy(fetchMock);
		expect(headersSent(fetchMock)).not.toHaveProperty('idempotency-key');
	});

	it("answers Gauzy's refusal of a key used for another button as it is", async () => {
		const refusal = {
			statusCode: 409,
			error: 'Conflict',
			message: 'This Idempotency-Key was used for another button of the message.'
		};
		gauzyAnswers(Response.json(refusal, { status: 409 }));

		const response = await POST(
			click({ 'Idempotency-Key': 'click-key-1' }, { actionId: 'snooze' }),
			idParams('message-1')
		);

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('lets no other browser header through, and never one that would replace the session', async () => {
		const fetchMock = gauzyAnswers(Response.json(ANSWER, { status: 200 }));

		await POST(
			click({ 'Idempotency-Key': 'click-key-1', 'X-Forwarded-For': '10.0.0.1', 'Organization-Id': 'other-org' }),
			idParams('message-1')
		);

		const headers = headersSent(fetchMock);
		expect(Object.keys(headers).sort()).toEqual([
			'Accept',
			'Content-Type',
			'authorization',
			'idempotency-key',
			'tenant-id'
		]);
	});
});
