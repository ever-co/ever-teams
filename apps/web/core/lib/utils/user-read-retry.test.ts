import { AxiosError } from 'axios';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	USER_READ_RETRY_FIRST_DELAY_MS,
	USER_READ_RETRY_MAX_DELAY_MS,
	isTemporaryReadFailure,
	userReadFailureReasonKey,
	userReadRetryDelay
} from './user-read-retry';

const unavailable = new ApiErrorService('Session check unavailable, retry later', 503);

function failedRead(errorUpdateCount: number, error: unknown = unavailable) {
	return { data: undefined, status: 'error' as const, error, errorUpdateCount };
}

describe('isTemporaryReadFailure', () => {
	it.each([500, 502, 503, 504, 408, 429])('reads %i as temporary', (status) => {
		expect(isTemporaryReadFailure(new ApiErrorService('Failed', status))).toBe(true);
	});

	it.each([400, 401, 403, 404])('reads %i as a refusal', (status) => {
		expect(isTemporaryReadFailure(new ApiErrorService('Refused', status))).toBe(false);
	});

	it('reads a read that never reached the API (refused connection, no network) as temporary', () => {
		const unreachable = ApiErrorService.fromAxiosError(new AxiosError('Network Error', AxiosError.ERR_NETWORK));

		expect(isTemporaryReadFailure(unreachable)).toBe(true);
		expect(userReadFailureReasonKey(unreachable)).toBe('toasts.REASONS.SERVER');
	});

	it('reads a read that timed out as temporary', () => {
		const timedOut = ApiErrorService.fromAxiosError(
			new AxiosError('timeout of 60000ms exceeded', AxiosError.ECONNABORTED)
		);

		expect(isTemporaryReadFailure(timedOut)).toBe(true);
		expect(userReadFailureReasonKey(timedOut)).toBe('toasts.REASONS.SERVER');
	});

	it('reads an answer the app could not read as no temporary failure', () => {
		expect(isTemporaryReadFailure(new Error('getAuthenticatedUserData API response'))).toBe(false);
	});
});

describe('userReadRetryDelay', () => {
	it('asks again 5 s after the first failure, then twice as long after each one, up to a minute', () => {
		const delays = [1, 2, 3, 4, 5, 6, 20].map((count) => userReadRetryDelay(failedRead(count)));

		expect(delays).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
		expect(USER_READ_RETRY_FIRST_DELAY_MS).toBe(5_000);
		expect(USER_READ_RETRY_MAX_DELAY_MS).toBe(60_000);
	});

	it('does not ask again while the user is known, even after a failed refresh', () => {
		const state = { data: { id: 'user-1' }, status: 'error' as const, error: unavailable, errorUpdateCount: 1 };

		expect(userReadRetryDelay(state)).toBe(false);
	});

	it('leaves a read still on its way to its own wait', () => {
		const state = { data: undefined, status: 'pending' as const, error: null, errorUpdateCount: 0 };

		expect(userReadRetryDelay(state)).toBe(false);
	});

	it('does not ask again after a refusal that would answer the same', () => {
		expect(userReadRetryDelay(failedRead(1, new ApiErrorService('Forbidden', 403)))).toBe(false);
	});
});

describe('userReadFailureReasonKey', () => {
	it('says the server could not complete it for a server error', () => {
		expect(userReadFailureReasonKey(unavailable)).toBe('toasts.REASONS.SERVER');
	});

	it('says the same for a read that got no answer in time, never that values were refused', () => {
		expect(userReadFailureReasonKey(new ApiErrorService('Connection Aborted', 408))).toBe('toasts.REASONS.SERVER');
	});

	it('keeps the reason of the other refusals', () => {
		expect(userReadFailureReasonKey(new ApiErrorService('Forbidden', 403))).toBe('toasts.REASONS.PERMISSION');
		expect(userReadFailureReasonKey(new ApiErrorService('Too many', 429))).toBe('toasts.REASONS.TOO_MANY');
		expect(userReadFailureReasonKey(new ApiErrorService('Bad request', 400))).toBe('toasts.REASONS.INVALID');
	});
});
