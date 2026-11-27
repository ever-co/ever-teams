/**
 * Test-only (never part of the app): a client service in direct mode whose every request Gauzy refuses with one
 * status, in Gauzy's error shape, with a spy on its error log, so a test measures what `APIService.logError` writes
 * for that status (`APIConfig.quietStatuses`).
 */
import { AxiosError, type AxiosResponse } from 'axios';
import type { APIService } from '@/core/services/client/api.service';

type ServiceInternals = { baseURL?: string; httpLogger: { logError: (error: unknown) => void } };

export interface RefusingClient {
	/** Refuses every request the service sends with `status`; answers the spy on its error log. */
	refuse(status: number): jest.SpyInstance;
	/** Gives the service back the address and the adapter it had (call it in `afterEach`). */
	restore(): void;
}

export function refusingClient(service: APIService): RefusingClient {
	const internals = service as unknown as ServiceInternals;
	const originalBaseUrl = internals.baseURL;
	const originalAdapter = service.axiosInstance.defaults.adapter;
	return {
		refuse(status) {
			// A base URL is what puts the service in direct mode: its own client sends, and logs, the request
			internals.baseURL = 'https://api.example.test';
			service.axiosInstance.defaults.adapter = (config) => {
				const response = {
					config,
					data: { statusCode: status, message: 'Refused' },
					headers: {},
					status,
					statusText: 'Refused'
				} as AxiosResponse;
				const message = `Request failed with status code ${status}`;
				return Promise.reject(new AxiosError(message, 'ERR_BAD_RESPONSE', config, null, response));
			};
			return jest.spyOn(internals.httpLogger, 'logError').mockImplementation(() => undefined);
		},
		restore() {
			internals.baseURL = originalBaseUrl;
			service.axiosInstance.defaults.adapter = originalAdapter;
		}
	};
}

/** What a call failed with, or `null` when it did not fail. */
export async function failureOf(call: Promise<unknown>): Promise<unknown> {
	return call.then(
		() => null,
		(error_: unknown) => error_
	);
}

/** The status of the error a spied error log was handed, call by call. */
export function loggedStatuses(errorLog: jest.SpyInstance): Array<number | undefined> {
	return errorLog.mock.calls.map(([error]) => (error as AxiosError).response?.status);
}

/**
 * Makes `call` against `service` refused 404, then 500: the 404 reaches no error log, the 500 fails the call and is
 * logged once. Answers what the 404 call failed with (`null` when it did not fail), for the test to check that its
 * caller reads it as the feature off.
 */
export async function expectOnly404Quiet(service: APIService, call: () => Promise<unknown>): Promise<unknown> {
	const client = refusingClient(service);
	try {
		const errorLog = client.refuse(404);
		const notFound = await failureOf(call());
		expect(loggedStatuses(errorLog)).toEqual([]);

		client.refuse(500);
		expect(await failureOf(call())).not.toBeNull();
		expect(loggedStatuses(errorLog)).toEqual([500]);
		return notFound;
	} finally {
		client.restore();
	}
}
