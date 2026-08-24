let currentAccessToken: string | null = 'token-a';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => currentAccessToken
}));

import { scopedReadConfig } from './api-request-scope';

describe('scopedReadConfig token rotation', () => {
	beforeEach(() => {
		currentAccessToken = 'token-a';
	});

	it('uses the latest cookie token while preserving the captured tenant scope', () => {
		const capturedScope = {
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			accessToken: 'token-a'
		};

		currentAccessToken = 'token-b';
		const config = scopedReadConfig({ scope: capturedScope });

		expect(config.tenantId).toBe('tenant-a');
		expect(config.pinnedAuthorization).toBe(true);
		expect(config.headers).toEqual({ Authorization: 'Bearer token-b' });
	});

	it('falls back to the captured token when no browser cookie is available', () => {
		currentAccessToken = null;

		const config = scopedReadConfig({
			scope: { tenantId: 'tenant-a', accessToken: 'captured-token' }
		});

		expect(config.headers).toEqual({ Authorization: 'Bearer captured-token' });
	});
});
