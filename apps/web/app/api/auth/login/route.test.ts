/**
 * POST /api/auth/login, the passcode sign-in's second attempt in proxy mode: a code that matches an invitation accepts
 * it and signs the person in. An invitation sent from the Invite dialog carries no name (Gauzy answers `fullName`
 * null), and the route answered 500 on it. Runs against a stand-in of the Gauzy API.
 */
import { INVITED, primeInvitedPerson } from '@/test/auth/invited-person';
import { RouteAgainstGauzy } from '@/test/auth/route-against-gauzy';

const login = new RouteAgainstGauzy(() => jest.requireActual<typeof import('./route')>('./route'));

function signInWithCode() {
	const { POST } = login.load();
	const body = { email: INVITED.email, code: INVITED.code };
	return POST(login.jsonPost('https://app.example.com/api/auth/login', body));
}

function acceptedInvitation() {
	const [accept] = login.gauzy.calls('POST', '/api/invite/accept');
	return accept?.body;
}

describe('POST /api/auth/login, invitation code', () => {
	it('signs in a person whose invitation carries no name, the account named after the address', async () => {
		primeInvitedPerson(login.gauzy, null);

		const res = await signInWithCode();

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.team.id).toBe(INVITED.teamId);
		expect(body.loginResponse.token).toBe(INVITED.accessToken);
		expect(res.headers.get('set-cookie') ?? '').toContain(`auth-token=${INVITED.accessToken}`);
		expect(acceptedInvitation()).toMatchObject({
			code: INVITED.code,
			email: INVITED.email,
			user: { firstName: 'invited', lastName: '', email: INVITED.email }
		});
	}, 15_000);

	it('still gives the invitation name to the account it opens', async () => {
		primeInvitedPerson(login.gauzy);

		const res = await signInWithCode();

		expect(res.status).toBe(200);
		expect(acceptedInvitation()).toMatchObject({ user: { firstName: 'Invited', lastName: 'Person' } });
	}, 15_000);
});
