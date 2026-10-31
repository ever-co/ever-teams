/**
 * Proxy mode: GET /api/auth/workspaces had no route and fell into the NextAuth catch-all, which answers 400, so the
 * app shell never loaded the team, tasks or timer after sign-in.
 */
import { gauzyAnswers, gauzyUrl, restoreFetch, sentToGauzy, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

afterEach(restoreFetch);

describe('GET /api/auth/workspaces', () => {
	it("forwards the query to Gauzy's GET /auth/workspaces with the session and answers what Gauzy answers", async () => {
		const workspaces = { workspaces: [{ user: { id: 'user-1' }, token: 'workspace-token' }], total_workspaces: 1 };
		const fetchMock = gauzyAnswers(Response.json(workspaces, { status: 200 }));

		const response = await GET(signedInRequest('https://app.ever.team/api/auth/workspaces?includeTeams=true'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/auth/workspaces?includeTeams=true'));
		expect(sent.method).toBe('GET');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(workspaces);
	});
});
