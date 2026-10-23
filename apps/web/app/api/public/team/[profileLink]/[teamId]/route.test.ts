/**
 * `GET /api/public/team/:profileLink/:teamId` is unauthenticated and relays to the Gauzy API. Its path parameters
 * arrive decoded, and were placed in the Gauzy path as they were: `..%2F..%2Fanything` walked the request to any GET
 * route of the API host the web app talks to (which may be an internal one). They are now encoded as path segments.
 */
import { GET } from './route';

describe('GET /api/public/team/:profileLink/:teamId', () => {
	const fetchMock = jest.fn();
	const realFetch = global.fetch;

	beforeEach(() => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'team' }), { status: 200 }));
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = realFetch;
	});

	const call = (profileLink: string, teamId: string, query = '') =>
		GET(new Request(`http://localhost/api/public/team/x/y${query}`), {
			params: Promise.resolve({ profileLink, teamId })
		});
	/** The path of the URL the route asked Gauzy for, as the URL parser resolves it. */
	const requestedPath = () => new URL(fetchMock.mock.calls[0][0] as string, 'http://gauzy.invalid').pathname;

	it.each([
		['the team', ''],
		['the team settings', '?type=misc']
	])('reads %s under /public/team only, whatever the parameters say', async (_label, query) => {
		const response = await call('../../..', '../user/me?', query);

		expect(response.status).toBe(200);
		expect(requestedPath()).toMatch(/\/public\/team\/..%2F..%2F..\/..%2Fuser%2Fme%3F$/);
	});

	it('passes an ordinary profile link and team id unchanged', async () => {
		await call('acme-team', '0f8b1c2e-6a3d-4f5e-9b7a-1c2d3e4f5a6b');

		expect(requestedPath()).toMatch(/\/public\/team\/acme-team\/0f8b1c2e-6a3d-4f5e-9b7a-1c2d3e4f5a6b$/);
	});

	it.each([
		['..', 'team'],
		['acme-team', '..'],
		['.', 'team']
	])('answers 400 for the dot segment %s / %s, and asks Gauzy nothing', async (profileLink, teamId) => {
		const response = await call(profileLink, teamId);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 400 without both parameters, and asks Gauzy nothing', async () => {
		const response = await call('', 'team');

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
