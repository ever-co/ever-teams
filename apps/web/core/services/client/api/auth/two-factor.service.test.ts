// cspell:ignore FGHIJ
/**
 * The person's own two-factor calls: bodies without tenant or organization (Gauzy's routes take neither), answers
 * holding a secret kept out of the development log, and a wrong code (401) shown as such, never a sign-out.
 */
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'organization 1'
}));

import { AxiosError, AxiosResponse } from 'axios';
import { twoFactorStatusFailureOf } from '@/core/lib/auth/two-factor';
import { twoFactorService } from './two-factor.service';

const client = twoFactorService as unknown as { baseURL?: string; httpLogger: { logError: (error: unknown) => void } };
const originalBaseUrl = client.baseURL;
const originalAdapter = twoFactorService.axiosInstance.defaults.adapter;

/** Direct mode: every request the client sends is refused with `status`, in Gauzy's error shape; answers its error log. */
function refusingEveryRequest(status: number): jest.SpyInstance {
	client.baseURL = 'https://api.example.test';
	twoFactorService.axiosInstance.defaults.adapter = async (config) => {
		const response = {
			config,
			data: { statusCode: status, message: 'Refused' },
			headers: {},
			status,
			statusText: 'Refused'
		} as AxiosResponse;
		throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
	};
	return jest.spyOn(client.httpLogger, 'logError').mockImplementation(() => undefined);
}

describe('twoFactorService', () => {
	afterEach(() => {
		client.baseURL = originalBaseUrl;
		twoFactorService.axiosInstance.defaults.adapter = originalAdapter;
		jest.restoreAllMocks();
	});

	it('reads the state for the active organization', async () => {
		const get = jest.spyOn(twoFactorService, 'get').mockResolvedValue({ data: { enabled: false } } as never);

		await twoFactorService.getStatus();

		expect(get).toHaveBeenCalledWith('/auth/two-factor?organizationId=organization%201', { quietStatuses: [404] });
	});

	it('fails the state read of an API without these routes with its 404, and keeps it out of the error log', async () => {
		const errorLog = refusingEveryRequest(404);

		const error = await twoFactorService.getStatus().then(
			() => null,
			(failure: unknown) => failure
		);

		expect(twoFactorStatusFailureOf(error)).toBe('unsupported');
		expect(errorLog).not.toHaveBeenCalled();
	});

	it('still logs a state read that failed with another status', async () => {
		const errorLog = refusingEveryRequest(500);

		await expect(twoFactorService.getStatus()).rejects.toBeTruthy();

		expect(errorLog).toHaveBeenCalledTimes(1);
		expect((errorLog.mock.calls[0][0] as AxiosError).response?.status).toBe(500);
	});

	it('keeps the secret of a new setup out of the log', async () => {
		const post = jest.spyOn(twoFactorService, 'post').mockResolvedValue({ data: {} } as never);

		await twoFactorService.enroll();

		expect(post).toHaveBeenCalledWith(
			'/auth/two-factor/enroll',
			{ issuer: expect.any(String) },
			{ secretResponse: true },
			false
		);
	});

	it.each([
		['confirm', () => twoFactorService.confirm('123456'), '/auth/two-factor/confirm', { code: '123456' }, true],
		[
			'disable',
			() => twoFactorService.disable({ code: '123456' }),
			'/auth/two-factor/disable',
			{ code: '123456' },
			false
		],
		[
			'regenerateRecoveryCodes',
			() => twoFactorService.regenerateRecoveryCodes({ recoveryCode: 'ABCDE-FGHIJ' }),
			'/auth/two-factor/recovery-codes',
			{ recoveryCode: 'ABCDE-FGHIJ' },
			true
		]
	])('%s expects the 401 of a wrong code', async (_name, call, path, body, holdsSecret) => {
		const post = jest.spyOn(twoFactorService, 'post').mockResolvedValue({ data: {} } as never);

		await call();

		const config = holdsSecret
			? { secretResponse: true, expectedUnauthorized: true }
			: { expectedUnauthorized: true };
		expect(post).toHaveBeenCalledWith(path, body, config, false);
	});

	it("resets a member's second factor by their user id", async () => {
		const remove = jest.spyOn(twoFactorService, 'delete').mockResolvedValue({ data: { reset: true } } as never);

		await expect(twoFactorService.resetMember('user-1')).resolves.toEqual({ reset: true });

		expect(remove).toHaveBeenCalledWith('/auth/two-factor/users/user-1');
	});
});
