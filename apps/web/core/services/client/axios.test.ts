import { AxiosAdapter, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const mockCookieState = {
	accessToken: null as string | null,
	activeTeamId: 'team-1',
	organizationId: 'organization-1',
	tenantId: 'cookie-tenant'
};

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockCookieState.accessToken,
	getActiveTeamIdCookie: () => mockCookieState.activeTeamId,
	getOrganizationIdCookie: () => mockCookieState.organizationId,
	getTenantIdCookie: () => mockCookieState.tenantId
}));

jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));

import { getAPI, getAPIDirect } from './axios';

function captureAdapter(configs: InternalAxiosRequestConfig[]): AxiosAdapter {
	return async (config) => {
		configs.push(config);
		return {
			config,
			data: { ok: true },
			headers: {},
			status: 200,
			statusText: 'OK'
		};
	};
}

describe.each([
	['getAPI', getAPI],
	['getAPIDirect', getAPIDirect]
] as const)('%s request interceptor', (_name, getClient) => {
	beforeEach(() => {
		mockCookieState.accessToken = null;
		mockCookieState.tenantId = 'cookie-tenant';
	});

	it.each(['tenant-id', 'Tenant-Id', 'TENANT-ID'])(
		'preserves an explicit %s header across a cookie switch',
		async (headerName) => {
			const client = await getClient();
			const sent: InternalAxiosRequestConfig[] = [];
			client.axiosInstance.defaults.adapter = captureAdapter(sent);

			const request = client.axiosInstance.get('/captured-header', {
				headers: { [headerName]: 'captured-tenant' }
			});
			mockCookieState.tenantId = 'new-cookie-tenant';
			await request;

			expect((sent[0].headers as AxiosHeaders).get('tenant-id')).toBe('captured-tenant');
		}
	);

	it('retains legacy cookie-derived tenant filling when the header is omitted', async () => {
		const client = await getClient();
		const sent: InternalAxiosRequestConfig[] = [];
		client.axiosInstance.defaults.adapter = captureAdapter(sent);
		mockCookieState.tenantId = 'legacy-cookie-tenant';

		await client.axiosInstance.get('/legacy-cookie');

		expect((sent[0].headers as AxiosHeaders).get('tenant-id')).toBe('legacy-cookie-tenant');
	});
});
