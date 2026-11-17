/**
 * Proxy mode: the split of one entry (ever-co/ever-gauzy#12030) is sent to Gauzy with the session's token, and answered
 * as Gauzy answers: both parts, a refusal with its code, or the 404 of an API without the route.
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

const URL = 'https://app.ever.team/api/timesheet/time-log/log-1/split';
const BODY = { splitAt: '2026-11-16T11:00:00.000Z', taskId: 'task-2' };

describe('POST /api/timesheet/time-log/[id]/split', () => {
	it("splits through Gauzy's POST /timesheet/time-log/:id/split and answers both parts", async () => {
		const parts = { first: { id: 'log-1' }, second: { id: 'log-2' } };
		const fetchMock = gauzyAnswers(Response.json(parts, { status: 201 }));

		const response = await POST(signedInRequest(URL, 'POST', BODY), idParams('log-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/timesheet/time-log/log-1/split'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual(BODY);
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(parts);
	});

	it("answers Gauzy's refusal of a member who may not change the entry with its status and code", async () => {
		const refusal = { statusCode: 403, code: 'TIME_LOG_SPLIT_APPROVED', message: 'Approved' };
		gauzyAnswers(Response.json(refusal, { status: 403 }));

		const response = await POST(signedInRequest(URL, 'POST', BODY), idParams('log-1'));

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it("answers an API without the route with Gauzy's 404, which the Calendar reads as not offered", async () => {
		const missing = { statusCode: 404, message: 'Cannot POST /api/timesheet/time-log/log-1/split' };
		gauzyAnswers(Response.json(missing, { status: 404 }));

		const response = await POST(signedInRequest(URL, 'POST', BODY), idParams('log-1'));

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual(missing);
	});

	it('keeps an id that names another endpoint in one path segment', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 404 }));

		await POST(signedInRequest(URL, 'POST', BODY), idParams('../status'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/timesheet/time-log/..%2Fstatus/split'));
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 201 }));

		const response = await POST(new Request(URL, { method: 'POST' }), idParams('log-1'));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses a request another site makes with the session cookies, before anything reaches Gauzy', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 201 }));

		const response = await POST(
			signedInRequest(URL, 'POST', BODY, { 'sec-fetch-site': 'cross-site' }),
			idParams('log-1')
		);

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
