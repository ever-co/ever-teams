/**
 * `everConnectService.health` as the read leaves the client: a paired API without the Ever Platform module answers
 * 404, which the read turns into `null` (the connection parts stay hidden) and keeps out of the error log; any other
 * failure still fails the read and is logged.
 */
import { AxiosError, AxiosResponse } from 'axios';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import { everConnectService } from './ever-connect.service';

const SCOPE = { tenantId: 'tenant-1', organizationId: 'organization-1', userId: 'user-1', accessToken: 'token-1' };

const client = everConnectService as unknown as { baseURL?: string; httpLogger: { logError: jest.Mock } };
const originalBaseUrl = client.baseURL;
const originalAdapter = everConnectService.axiosInstance.defaults.adapter;

/** Direct mode: every request the client sends is refused with `status`, in Gauzy's error shape. */
function refusingEveryRequest(status: number): void {
	client.baseURL = 'https://api.example.test';
	everConnectService.axiosInstance.defaults.adapter = async (config) => {
		const response = {
			config,
			data: { statusCode: status, message: 'Refused' },
			headers: {},
			status,
			statusText: 'Refused'
		} as AxiosResponse;
		throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
	};
}

describe('everConnectService.health', () => {
	afterEach(() => {
		client.baseURL = originalBaseUrl;
		everConnectService.axiosInstance.defaults.adapter = originalAdapter;
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	it('asks with the scope of its render, and asks the client to keep a 404 out of its error log', async () => {
		const get = jest
			.spyOn(everConnectService, 'get')
			.mockResolvedValue({ data: { connected: true }, status: 200 } as never);

		await expect(everConnectService.health({ scope: SCOPE })).resolves.toEqual({ connected: true });

		expect(get).toHaveBeenCalledWith(
			'/ever-connect/health',
			expect.objectContaining({
				tenantId: 'tenant-1',
				pinnedAuthorization: true,
				headers: { Authorization: 'Bearer token-1' },
				quietStatuses: [404]
			})
		);
	});

	it('answers null for a paired API without the module, and keeps its 404 out of the error log', async () => {
		refusingEveryRequest(404);

		await expect(everConnectService.health({ scope: SCOPE })).resolves.toBeNull();

		expect(client.httpLogger.logError).not.toHaveBeenCalled();
	});

	it('still fails, and logs, a health read that failed with another status', async () => {
		refusingEveryRequest(500);

		await expect(everConnectService.health({ scope: SCOPE })).rejects.toBeTruthy();

		expect(client.httpLogger.logError).toHaveBeenCalledTimes(1);
		expect(client.httpLogger.logError.mock.calls[0][0].response.status).toBe(500);
	});
});
