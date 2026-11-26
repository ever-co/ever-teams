/**
 * `taskAutomationsService.templates`, the availability probe of Settings → Automations, as the read leaves the client:
 * a platform without the plugin answers 404, which the read fails with (the entry and the page hide) and keeps out of
 * the error log; any other failure is still logged.
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

import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { taskAutomationsService } from './task-automations.service';

const client = taskAutomationsService as unknown as { baseURL?: string; httpLogger: { logError: jest.Mock } };
const originalBaseUrl = client.baseURL;
const originalAdapter = taskAutomationsService.axiosInstance.defaults.adapter;

/** Direct mode: every request the client sends is refused with `status`, in Gauzy's error shape. */
function refusingEveryRequest(status: number): void {
	client.baseURL = 'https://api.example.test';
	taskAutomationsService.axiosInstance.defaults.adapter = async (config) => {
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

describe('taskAutomationsService.templates', () => {
	afterEach(() => {
		client.baseURL = originalBaseUrl;
		taskAutomationsService.axiosInstance.defaults.adapter = originalAdapter;
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	it('names the organization, and asks the client to keep a 404 out of its error log', async () => {
		const get = jest.spyOn(taskAutomationsService, 'get').mockResolvedValue({ data: [], status: 200 } as never);
		const signal = new AbortController().signal;

		await expect(taskAutomationsService.templates('organization 1', signal)).resolves.toEqual([]);

		expect(get).toHaveBeenCalledWith('/task-automations/templates?organizationId=organization%201', {
			signal,
			quietStatuses: [404]
		});
	});

	it('fails the probe of a platform without the plugin with its 404, and keeps it out of the error log', async () => {
		refusingEveryRequest(404);

		const error = await taskAutomationsService.templates('organization-1').then(
			() => null,
			(failure: unknown) => failure
		);

		// The status `availabilityOfError` (use-task-automations.ts) reads as `unavailable`
		expect(errorStatusOf(error)).toBe(404);
		expect(client.httpLogger.logError).not.toHaveBeenCalled();
	});

	it('still logs a probe that failed with another status', async () => {
		refusingEveryRequest(500);

		await expect(taskAutomationsService.templates('organization-1')).rejects.toBeTruthy();

		expect(client.httpLogger.logError).toHaveBeenCalledTimes(1);
		expect(client.httpLogger.logError.mock.calls[0][0].response.status).toBe(500);
	});

	it('still logs a 404 of the rules list, which is not an availability answer', async () => {
		refusingEveryRequest(404);

		await expect(taskAutomationsService.list('organization-1')).rejects.toBeTruthy();

		expect(client.httpLogger.logError).toHaveBeenCalledTimes(1);
	});
});
