/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://teams.example.org/settings/team/members"}
 */
// The two collaborators of getPublicRuntimeEnv that are not about this key
jest.mock('@/core/services/server/requests/desktop-source', () => ({
	getDesktopConfig: () => ({})
}));
jest.mock('@/core/lib/utils/check-provider-env-vars', () => ({
	getConfiguredAuthProviderIds: () => []
}));

const CONFIGURED_PAGE = 'https://join.example.org/auth/accept-invite';
const INVITATION = { emails: ['ines.okafor@example.com'], teamId: 'team-1', organizationId: 'organization-1' };
const PUBLISHED_KEYS = ['INVITE_CALLBACK_URL', 'NEXT_PUBLIC_GAUZY_API_SERVER_URL'] as const;

/**
 * A deployment that sets INVITE_CALLBACK_URL, in direct mode, end to end with the real runtime env: the server's
 * getPublicRuntimeEnv() publishes it on <html> (as app/[locale]/layout.tsx does), and the browser's first invitation
 * names it, with nothing left in process.env for the build-time fallback to find. The server routes of proxy mode
 * already used it.
 */
describe('inviteService, a configured invitation page through the runtime env', () => {
	const original = Object.fromEntries(PUBLISHED_KEYS.map((key) => [key, process.env[key]]));

	afterEach(() => {
		jest.restoreAllMocks();
		document.documentElement.removeAttribute('data-ever-teams-runtime-env');
		delete (globalThis as Record<string, unknown>).__EVER_TEAMS_RUNTIME_ENV__;
		for (const key of PUBLISHED_KEYS) {
			if (original[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = original[key];
			}
		}
	});

	it('names the page the server published for a first invitation in direct mode', async () => {
		let service!: typeof import('.').inviteService;
		// require() inside jest.isolateModules: each module is loaded fresh, after the page carries the runtime env.
		jest.isolateModules(() => {
			process.env.INVITE_CALLBACK_URL = CONFIGURED_PAGE;
			process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL = 'https://api.example.org';
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { getPublicRuntimeEnv } = require('@/core/services/server/runtime-env');
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute } = require('@/env-config');
			const published = getPublicRuntimeEnv();
			expect(published.INVITE_CALLBACK_URL).toBe(CONFIGURED_PAGE);

			document.documentElement.setAttribute(RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute(published));
			for (const key of PUBLISHED_KEYS) {
				delete process.env[key];
			}

			// eslint-disable-next-line @typescript-eslint/no-require-imports
			service = require('.').inviteService;
		});
		jest.spyOn(service, 'get').mockResolvedValue({ data: { id: 'role-employee' } } as never);
		const post = jest.spyOn(service, 'post').mockResolvedValue({ data: { items: [], total: 0 } } as never);

		await service.inviteByEmails(INVITATION);

		expect(post).toHaveBeenCalledWith(
			'/invite/emails',
			expect.objectContaining({ emailIds: INVITATION.emails, callbackUrl: CONFIGURED_PAGE }),
			expect.anything()
		);
	});
});
