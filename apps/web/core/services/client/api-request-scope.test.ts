import { scopedReadConfig } from './api-request-scope';

describe('scopedReadConfig token rotation', () => {
	it('keeps a captured tenant paired with the token captured in the same render', () => {
		const capturedScope = {
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			accessToken: 'token-a'
		};

		const config = scopedReadConfig({ scope: capturedScope });

		expect(config.tenantId).toBe('tenant-a');
		expect(config.pinnedAuthorization).toBe(true);
		expect(config.headers).toEqual({ Authorization: 'Bearer token-a' });
	});

	it('omits authorization when the captured scope has no token', () => {
		const config = scopedReadConfig({
			scope: { tenantId: 'tenant-a', accessToken: null }
		});

		expect(config.headers).toBeUndefined();
	});
});
