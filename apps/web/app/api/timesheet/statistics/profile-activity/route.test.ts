/**
 * Proxy mode: a profile's month summary (#5612) is read through Gauzy with the session's token and tenant, with the
 * query the page sent, and answered as Gauzy answers.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

const QUERY = 'organizationId=organization-1&employeeId=employee-1&startDate=2026-11-01&endDate=2026-11-30&timeZone=Europe%2FBerlin';
const URL = `https://app.example.com/api/timesheet/statistics/profile-activity?${QUERY}`;
const SUMMARY = {
	employeeId: 'employee-1',
	period: { startDate: '2026-11-01', endDate: '2026-11-30', timeZone: 'Europe/Berlin' },
	totalDuration: 93600
};

describe('GET /api/timesheet/statistics/profile-activity', () => {
	it("reads the summary through Gauzy's own route, with the page's query", async () => {
		const fetchMock = gauzyAnswers(Response.json(SUMMARY, { status: 200 }));

		const response = await GET(signedInRequest(URL));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl(`/timesheet/statistics/profile-activity?${QUERY}`));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(SUMMARY);
	});

	it("passes Gauzy's refusal on with its status", async () => {
		const forbidden = { statusCode: 403, message: 'Forbidden resource' };
		gauzyAnswers(Response.json(forbidden, { status: 403 }));

		const response = await GET(signedInRequest(URL));

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual(forbidden);
	});

	it('sends nothing for a browser without a session', async () => {
		const fetchMock = gauzyAnswers(Response.json(SUMMARY, { status: 200 }));

		const response = await GET(new Request(URL));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
