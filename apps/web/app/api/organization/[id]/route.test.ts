/**
 * Proxy mode: GET /api/organization/:id had no route and answered 404, so the weekly limit report, which needs the
 * organization before it renders, never left its loading skeleton.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

describe('GET /api/organization/:id', () => {
	it("reads the organization from Gauzy's GET /organization/:id with the session and answers what Gauzy answers", async () => {
		const organization = { id: 'org-1', name: 'Acme', tenantId: 'tenant-1' };
		const fetchMock = gauzyAnswers(Response.json(organization, { status: 200 }));

		const response = await GET(signedInRequest('https://app.ever.team/api/organization/org-1'), idParams('org-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/organization/org-1'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(organization);
	});
});
