/**
 * Proxy mode: the labels of one entry (#5368, ever-gauzy #12029) are sent to Gauzy with the session's token, from this
 * app's own pages only.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { PUT } from './route';

afterEach(restoreFetch);

const URL = 'https://app.ever.team/api/timesheet/time-log/log-1/tags';
const BODY = { tagIds: ['tag-meeting'] };

describe('PUT /api/timesheet/time-log/[id]/tags', () => {
	it("files the entry under its labels through Gauzy's PUT /timesheet/time-log/:id/tags", async () => {
		const fetchMock = gauzyAnswers(Response.json({ id: 'log-1' }, { status: 200 }));

		const response = await PUT(signedInRequest(URL, 'PUT', BODY), idParams('log-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/timesheet/time-log/log-1/tags'));
		expect(sent.method).toBe('PUT');
		expect(sent.body).toEqual(BODY);
		expect(response.status).toBe(200);
	});

	it('refuses a request another site makes with the session cookies, before anything reaches Gauzy', async () => {
		const fetchMock = gauzyAnswers(Response.json({}, { status: 200 }));

		const response = await PUT(
			signedInRequest(URL, 'PUT', BODY, { origin: 'https://evil.example' }),
			idParams('log-1')
		);

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
