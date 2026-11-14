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

import { APIService } from './api.service';
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

function createService(): APIService {
	const service = new APIService('https://api.example.test', { enableLogging: false });
	service.axiosInstance.defaults.adapter = unauthorizedAdapter();
	return service;
}

describe('APIService and a refusal the caller expects', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		window.history.pushState({}, '', '/settings/personal/security');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.mocked(handleUnauthorized).mockClear();
	});

	it('does not treat a wrong second-factor code as a lost session', async () => {
		const service = createService();

		await expect(
			service.post('/auth/two-factor/disable', { code: '000000' }, { expectedUnauthorized: true })
		).rejects.toBeDefined();

		expect(handleUnauthorized).not.toHaveBeenCalled();
	});

	it('still treats any other 401 as a lost session', async () => {
		const service = createService();

		await expect(service.post('/tasks', {})).rejects.toBeDefined();

		expect(handleUnauthorized).toHaveBeenCalled();
	});
});
