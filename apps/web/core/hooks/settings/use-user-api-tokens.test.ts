jest.mock('@/core/services/client/api/users/user-api-tokens.service', () => ({ userApiTokensService: {} }));

import { createFailureOf, shouldRetryConfig, userApiTokensAvailabilityOf } from './use-user-api-tokens';

function failure(status: number) {
	return { statusCode: status, message: 'refused' };
}

describe('whether the API tokens page exists here', () => {
	it('exists only once the server says it has the tokens on', () => {
		expect(userApiTokensAvailabilityOf({ status: 'success', data: { enabled: true }, error: null })).toBe(
			'enabled'
		);
		expect(userApiTokensAvailabilityOf({ status: 'success', data: { enabled: false }, error: null })).toBe(
			'disabled'
		);
		expect(userApiTokensAvailabilityOf({ status: 'pending', data: undefined, error: null })).toBe('loading');
	});

	it('reads an API without the tokens at all (404) as tokens off', () => {
		expect(userApiTokensAvailabilityOf({ status: 'error', data: undefined, error: failure(404) })).toBe('disabled');
	});

	it('keeps any other failure apart, so the page can offer a retry', () => {
		expect(userApiTokensAvailabilityOf({ status: 'error', data: undefined, error: failure(503) })).toBe('error');
		expect(userApiTokensAvailabilityOf({ status: 'error', data: undefined, error: new Error('offline') })).toBe(
			'error'
		);
	});

	it('asks again only after a temporary failure, twice at most', () => {
		expect(shouldRetryConfig(0, failure(503))).toBe(true);
		expect(shouldRetryConfig(2, failure(503))).toBe(false);
		expect(shouldRetryConfig(0, failure(404))).toBe(false);
		expect(shouldRetryConfig(0, failure(401))).toBe(false);
	});
});

describe('why a token was not created', () => {
	it("names Gauzy's refusal of an eleventh working token", () => {
		const tooMany = {
			statusCode: 400,
			message: 'You can hold 10 API tokens at once. Revoke one you no longer use first.'
		};

		expect(createFailureOf(tooMany)).toBe('LIMIT_REACHED');
	});

	it('reads the tokens turned off meanwhile apart from any other failure', () => {
		expect(createFailureOf(failure(404))).toBe('DISABLED');
		expect(createFailureOf(failure(500))).toBe('FAILED');
		expect(createFailureOf({ statusCode: 400, message: 'name must be shorter' })).toBe('FAILED');
	});
});
