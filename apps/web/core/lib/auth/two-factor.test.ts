import {
	authenticatorCodeOf,
	isAuthenticatorCode,
	isRecoveryCode,
	recoveryCodeOf,
	recoveryCodesFileText,
	retryAfterSecondsOf,
	retryMinutesOf,
	secretGroupsOf,
	twoFactorChallengeOf,
	twoFactorStatusFailureOf
} from './two-factor';

const challengeBody = {
	statusCode: 403,
	error: 'Forbidden',
	code: 'TWO_FACTOR_REQUIRED',
	message: 'Two-factor authentication is on for this account.',
	challenge: 'signed.challenge.value',
	expiresAt: '2026-11-14T12:05:00.000Z'
};

describe('twoFactorChallengeOf', () => {
	it('reads the challenge of an axios error (proxy mode answers with the API body)', () => {
		const error = { isAxiosError: true, response: { status: 403, data: challengeBody } };

		expect(twoFactorChallengeOf(error)).toEqual({
			challenge: 'signed.challenge.value',
			expiresAt: '2026-11-14T12:05:00.000Z',
			message: 'Two-factor authentication is on for this account.'
		});
	});

	it('reads the challenge kept in the details of an API error (direct mode)', () => {
		const error = {
			isApiError: true,
			statusCode: 403,
			errorCode: 'TWO_FACTOR_REQUIRED',
			details: { challenge: 'signed.challenge.value', expiresAt: '2026-11-14T12:05:00.000Z' }
		};

		expect(twoFactorChallengeOf(error)?.challenge).toBe('signed.challenge.value');
	});

	it('reads a plain body', () => {
		expect(twoFactorChallengeOf(challengeBody)?.expiresAt).toBe('2026-11-14T12:05:00.000Z');
	});

	it('is null for any other refusal, and for a 403 without a challenge', () => {
		expect(twoFactorChallengeOf({ response: { status: 400, data: { errors: { email: 'x' } } } })).toBeNull();
		expect(twoFactorChallengeOf({ response: { status: 403, data: { code: 'TWO_FACTOR_REQUIRED' } } })).toBeNull();
		expect(twoFactorChallengeOf(new Error('network'))).toBeNull();
		expect(twoFactorChallengeOf(undefined)).toBeNull();
	});
});

describe('authenticator and recovery codes', () => {
	it('keeps the digits of a pasted code, six at most', () => {
		expect(authenticatorCodeOf(' 123 456 ')).toBe('123456');
		expect(authenticatorCodeOf('12-34-5678')).toBe('123456');
		expect(isAuthenticatorCode('123456')).toBe(true);
		expect(isAuthenticatorCode('12345')).toBe(false);
		expect(isAuthenticatorCode('12345a')).toBe(false);
	});

	it('normalizes a recovery code as the API writes it', () => {
		expect(recoveryCodeOf(' abcde-fghij ')).toBe('ABCDE-FGHIJ');
		expect(recoveryCodeOf('abcde fghij')).toBe('ABCDEFGHIJ');
		expect(isRecoveryCode('ABCDE-FGHIJ')).toBe(true);
		expect(isRecoveryCode('ABC-12')).toBe(false);
	});
});

describe('retry after too many codes', () => {
	it('reads the seconds of a 429, from the body or the header', () => {
		expect(retryAfterSecondsOf({ response: { status: 429, data: { retryAfter: 900 } } })).toBe(900);
		expect(retryAfterSecondsOf({ response: { status: 429, data: {}, headers: { 'retry-after': '120' } } })).toBe(
			120
		);
		expect(retryAfterSecondsOf({ isApiError: true, statusCode: 429, details: { retryAfter: 61 } })).toBe(61);
		expect(retryAfterSecondsOf({ response: { status: 401, data: {} } })).toBeNull();
	});

	it('says it in whole minutes, one at least', () => {
		expect(retryMinutesOf(900)).toBe(15);
		expect(retryMinutesOf(61)).toBe(2);
		expect(retryMinutesOf(5)).toBe(1);
	});
});

describe('setup helpers', () => {
	it('groups the secret by four for typing', () => {
		expect(secretGroupsOf('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
		expect(secretGroupsOf('ABCDE')).toBe('ABCD E');
	});

	it('writes the recovery codes file, one code a line', () => {
		const text = recoveryCodesFileText({
			codes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'],
			heading: 'Ever Teams recovery codes'
		});

		expect(text.split('\n')).toEqual(['Ever Teams recovery codes', '', 'AAAAA-BBBBB', 'CCCCC-DDDDD', '']);
	});

	it('tells an API without the routes from a failed read', () => {
		expect(twoFactorStatusFailureOf({ response: { status: 404 } })).toBe('unsupported');
		expect(twoFactorStatusFailureOf({ isApiError: true, statusCode: 404 })).toBe('unsupported');
		expect(twoFactorStatusFailureOf({ response: { status: 500 } })).toBe('error');
		expect(twoFactorStatusFailureOf(new Error('offline'))).toBe('error');
	});
});
