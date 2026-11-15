// cspell:ignore KHTML
/**
 * Every call of this server that signs a session in or renews it carries the user agent of the browser it answers
 * (ever-co/ever-gauzy#11983): Gauzy records that agent with the session's tokens and names the session's device with
 * it in Settings > Profile > Sessions. This server's own ("node") is an unknown device.
 */
import { EProvider } from '@/core/types/generics/enums/social-accounts';
import {
	loginUserRequest,
	openWorkspaceServerRequest,
	refreshTokenRequest,
	registerUserRequest,
	signInEmailConfirmRequest,
	signInEmailPasswordRequest,
	signInWorkspaceRequest,
	signWithSocialLoginsRequest,
	switchOrganizationServerRequest,
	switchWorkspaceServerRequest,
	verifyAuthCodeRequest
} from './auth';
import { everIdWorkspaceSigninRequest } from './ever-id';
import { acceptInviteRequest } from './invite';
import { verifyTwoFactorRequest } from './two-factor';

// The name this app gives itself, whatever APP_NAME the machine running the tests sets
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	APP_NAME: 'Ever Teams'
}));
jest.mock('next/headers', () => ({
	headers: async () =>
		new Headers({
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
		})
}));

const CHROME =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const realFetch = global.fetch;
let sent: jest.Mock<Promise<Response>, [string, RequestInit?]>;

beforeEach(() => {
	sent = jest.fn<Promise<Response>, [string, RequestInit?]>(async () => new Response('{}', { status: 200 }));
	global.fetch = sent as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = realFetch;
});

it.each([
	['a password sign-in', () => loginUserRequest('marie@ever.test', 'password')],
	['a password sign-in that lists the workspaces', () => signInEmailPasswordRequest('marie@ever.test', 'password')],
	['a social sign-in', () => signWithSocialLoginsRequest(EProvider.GOOGLE, 'provider-token')],
	['a code sign-in', () => signInEmailConfirmRequest({ code: '12345678', email: 'marie@ever.test' })],
	['a code verified', () => verifyAuthCodeRequest('marie@ever.test', '12345678')],
	[
		'a workspace sign-in',
		() =>
			signInWorkspaceRequest({ email: 'marie@ever.test', token: 'workspace-token' } as Parameters<
				typeof signInWorkspaceRequest
			>[0])
	],
	[
		'a registration',
		() => registerUserRequest({ email: 'marie@ever.test' } as unknown as Parameters<typeof registerUserRequest>[0])
	],
	['a renewal', () => refreshTokenRequest('refresh-token')],
	['a workspace opened', () => openWorkspaceServerRequest('access-token', 'tenant-1')],
	['a workspace switch', () => switchWorkspaceServerRequest({ tenantId: 'tenant-1' }, 'access-token')],
	[
		'an organization switch',
		() =>
			switchOrganizationServerRequest({ organizationId: 'organization-1', tenantId: 'tenant-1' }, 'access-token')
	],
	[
		'an invitation accepted',
		() => acceptInviteRequest({ email: 'marie@ever.test' } as Parameters<typeof acceptInviteRequest>[0])
	],
	['a second factor', () => verifyTwoFactorRequest({} as Parameters<typeof verifyTwoFactorRequest>[0])],
	['an Ever ID workspace sign-in', () => everIdWorkspaceSigninRequest('marie@ever.test', 'workspace-token')]
])("sends the browser's user agent with %s", async (_case, call) => {
	await call();

	expect((sent.mock.calls[0][1]?.headers as Record<string, string> | undefined)?.['User-Agent']).toBe(CHROME);
});

it('names this app on the Ever ID calls too', async () => {
	await everIdWorkspaceSigninRequest('marie@ever.test', 'workspace-token');

	expect(sent.mock.calls[0][1]?.headers).toMatchObject({ 'X-Client-App': 'Ever Teams' });
});
