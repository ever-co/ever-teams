/**
 * POST /api/auth/signin-email-password, the password sign-in in proxy mode (#5741): the API's refusal of a wrong
 * password goes back to the form with its 401, where the route answered an empty 500. Runs against a stand-in of the
 * Gauzy API.
 */
import { tolerateServerFetchRejections } from '@/test/auth/server-fetch-rejections';
import { RouteAgainstGauzy } from '@/test/auth/route-against-gauzy';

const signIn = new RouteAgainstGauzy(() => jest.requireActual<typeof import('./route')>('./route'));

function signInWith(password: string) {
	const { POST } = signIn.load();
	const body = { email: 'amani.otieno@example.com', password };
	return POST(signIn.jsonPost('https://app.example.com/api/auth/signin-email-password', body));
}

describe('POST /api/auth/signin-email-password', () => {
	it("answers the API's 401 for a wrong password, so the form can say so", async () => {
		signIn.gauzy.on('POST', '/api/auth/signin.email.password', {
			status: 401,
			body: { message: 'Unauthorized', statusCode: 401 }
		});
		tolerateServerFetchRejections();

		const res = await signInWith('not-her-password');

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ message: 'Unauthorized', statusCode: 401 });
	}, 15_000);

	it('answers 502, never a wrong password, when the API gives no readable answer', async () => {
		signIn.gauzy.on('POST', '/api/auth/signin.email.password', { status: 500, body: 'Internal Server Error' });
		tolerateServerFetchRejections();

		const res = await signInWith('her-password');

		expect(res.status).toBe(502);
	}, 15_000);

	it('answers the workspaces of a right password, as before', async () => {
		const workspaces = { workspaces: [{ token: 'workspace-token', user: { id: 'user-1' } }], total_workspaces: 1 };
		signIn.gauzy.on('POST', '/api/auth/signin.email.password', { status: 200, body: workspaces });

		const res = await signInWith('her-password');

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(workspaces);
	}, 15_000);

	it('refuses a form without a password before asking the API', async () => {
		const res = await signInWith('');

		expect(res.status).toBe(400);
		expect(signIn.gauzy.calls('POST', '/api/auth/signin.email.password')).toHaveLength(0);
	}, 15_000);
});
