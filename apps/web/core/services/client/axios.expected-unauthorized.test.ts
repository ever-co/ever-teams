/**
 * @jest-environment jsdom
 */
import { AxiosAdapter, AxiosError, AxiosResponse } from 'axios';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => 'access-token',
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('../logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('../logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import { APIConfig, getAPI, getAPIDirect } from './axios';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';

function unauthorizedAdapter(): AxiosAdapter {
	return async (config) => {
		const response: AxiosResponse = {
			config,
			data: { statusCode: 401, message: 'The code is not right.' },
			headers: {},
			status: 401,
			statusText: 'Unauthorized'
		};
		throw new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, response);
	};
}

// The proxy mode client (`getAPI`) and the direct one (`getAPIDirect`) add their own 401 handling to APIService's
describe.each([
	['getAPI', getAPI],
	['getAPIDirect', getAPIDirect]
] as const)('%s and a refusal the caller expects', (_name, getClient) => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		window.history.pushState({}, '', '/auth/passcode');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.mocked(handleUnauthorized).mockClear();
	});

	it('does not treat a wrong second-factor code as a lost session', async () => {
		const client = await getClient();
		client.axiosInstance.defaults.adapter = unauthorizedAdapter();

		await expect(
			client.axiosInstance.post('/auth/two-factor/verify', { code: '000000' }, {
				expectedUnauthorized: true
			} as APIConfig)
		).rejects.toBeDefined();

		expect(handleUnauthorized).not.toHaveBeenCalled();
	});

	it('still treats any other 401 as a lost session', async () => {
		const client = await getClient();
		client.axiosInstance.defaults.adapter = unauthorizedAdapter();

		await expect(client.axiosInstance.post('/tasks', {})).rejects.toBeDefined();

		expect(handleUnauthorized).toHaveBeenCalled();
	});
});
