/**
 * Proxy mode: POST /api/auth/switch-workspace had no route and fell into the NextAuth catch-all, which answers 400,
 * so the workspace switcher could not switch.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { POST } from './route';

afterEach(restoreFetch);

describe('POST /api/auth/switch-workspace', () => {
	it("forwards the body to Gauzy's POST /auth/switch-workspace with the session and answers what Gauzy answers", async () => {
		const switched = {
			user: { id: 'user-1', tenantId: 'tenant-2' },
			token: 'access-2',
			refresh_token: 'refresh-2'
		};
		const fetchMock = gauzyAnswers(Response.json(switched, { status: 200 }));
		const request = signedInRequest('https://app.ever.team/api/auth/switch-workspace', 'POST', {
			tenantId: 'tenant-2'
		});

		const response = await POST(request);

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/switch-workspace'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual({ tenantId: 'tenant-2' });
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(switched);
	});
});
