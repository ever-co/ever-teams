/**
 * A person signs up (an account Gauzy activates at once), and is still signed in a day later.
 *
 * The sign-up renews the token of its sign-in once, for the tenant it has just created. Gauzy rotates the refresh
 * token then: the one the sign-in answered is refused from that moment. The sign-up kept that one and dropped the one
 * the renewal answered, and the first renewal of the session, once the access token had expired, ended it.
 *
 * The renewal of the sign-up, the store of the session and the HTTP client are the app's own here: `fetch` is a
 * stand-in for Gauzy, and the requests that create the workspace answer what Gauzy answers them.
 */
import { showMessage } from 'react-native-flash-message';
import { AuthenticationStoreModel } from '../../../../models/authentication-store';
import { createFakeGauzy, FakeGauzy, HOUR_MS } from '../../../../../test/fake-gauzy-session';
import { currentAuthenticatedUserRequest, loginUserRequest, registerUserRequest } from '../../requests/auth';
import { register } from './register';

jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('../../../../helpers/generate-secure-token', () => ({
	__esModule: true,
	default: async () => '0'.repeat(32),
	generateSecureToken: async () => '0'.repeat(32)
}));
// The account and its sign-in are made below; the renewal of the sign-up goes through the app's HTTP client
jest.mock('../../requests/auth', () => ({
	...jest.requireActual('../../requests/auth'),
	registerUserRequest: jest.fn(),
	loginUserRequest: jest.fn()
}));
jest.mock('../../requests/tenant', () => ({
	createTenantRequest: jest.fn(async () => ({ data: { id: 'tenant-1' } }))
}));
jest.mock('../../requests/features/smtp', () => ({ createSmtpTenantRequest: jest.fn(async () => ({ data: {} })) }));
jest.mock('../../requests/organization', () => ({
	createOrganizationRequest: jest.fn(async () => ({ data: { id: 'organization-1' } }))
}));
jest.mock('../../requests/employee', () => ({
	createEmployeeFromUser: jest.fn(async () => ({ data: { id: 'employee-1' } }))
}));
jest.mock('../../requests/organization-team', () => ({
	createOrganizationTeamRequest: jest.fn(async () => ({
		data: { id: 'team-1', tenantId: 'tenant-1', organizationId: 'organization-1' }
	})),
	getAllOrganizationTeamRequest: jest.fn(async () => ({
		data: { items: [{ id: 'team-1', tenantId: 'tenant-1', organizationId: 'organization-1' }] }
	}))
}));
jest.mock('./workspace-setup', () => ({ savePendingSignup: jest.fn(async () => true) }));

const originalFetch = global.fetch;
const START = Date.parse('2026-11-14T09:00:00.000Z');

let gauzy: FakeGauzy;

beforeEach(() => {
	jest.setSystemTime(START);
	(showMessage as jest.Mock).mockClear();
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
});

it('keeps the refresh token its renewal answered: the session is renewed once the access token expires', async () => {
	const signIn = gauzy.signIn();
	(registerUserRequest as jest.Mock).mockResolvedValue({
		data: { id: 'user-1', isActive: true },
		response: { ok: true, status: 201 }
	});
	(loginUserRequest as jest.Mock).mockResolvedValue({
		data: { user: { id: 'user-1' }, token: signIn.token, refresh_token: signIn.refresh_token },
		response: { ok: true, status: 201 }
	});

	const { response } = await register({ email: 'ada@example.org', name: 'Ada Lovelace', team: 'Analytical' });
	const { loginRes } = (response as { data: { loginRes: { token: string; refresh_token: string } } }).data;

	// The sign-up renewed the session once, and the pair the app keeps is the one that renewal answered
	expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
	expect(gauzy.acceptsRefreshToken(loginRes.refresh_token)).toBe(true);

	// The sign-up screen keeps that pair (use-authentication-team.ts)
	const session = AuthenticationStoreModel.create({ user: null });
	session.setAuthToken(loginRes.token);
	session.setRefreshToken(loginRes.refresh_token);

	// A day later: the access token has expired, and the next request renews the session
	jest.setSystemTime(START + 25 * HOUR_MS);
	const profile = await currentAuthenticatedUserRequest({ bearer_token: String(session.authToken) });

	expect(profile.response.status).toBe(200);
	expect(session.isAuthenticated).toBe(true);
	expect(showMessage).not.toHaveBeenCalled();
});
