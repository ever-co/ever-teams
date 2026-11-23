import {
	INVALID_CODE_OR_EMAIL_MESSAGE,
	SIGN_IN_FIRST_CODE,
	SIGN_IN_FIRST_MESSAGE,
	carriesSignInFirstCode,
	inviteAcceptRefusalAnswer,
	isSignInFirstError
} from './invite-sign-in-first';
import { ApiErrorService } from '@/core/services/client/api-error.service';

describe('inviteAcceptRefusalAnswer', () => {
	it('tells a person whose address already has an account to sign in first', () => {
		const refusal = { statusCode: 409, message: 'This email already has an account.', error: 'Conflict' };

		expect(inviteAcceptRefusalAnswer(refusal)).toEqual({
			errors: { email: SIGN_IN_FIRST_MESSAGE },
			code: SIGN_IN_FIRST_CODE
		});
	});

	it.each([
		['a wrong code', { statusCode: 400, message: 'Invite does not exist' }],
		['too many attempts', { statusCode: 429 }],
		['an unreachable API', undefined],
		['an answer that is no object', 'Bad Gateway']
	])('keeps the usual message for %s', (_case, refusal) => {
		expect(inviteAcceptRefusalAnswer(refusal)).toEqual({ errors: { email: INVALID_CODE_OR_EMAIL_MESSAGE } });
	});
});

describe('carriesSignInFirstCode', () => {
	it('reads the code a sign-in route answered with', () => {
		expect(carriesSignInFirstCode(inviteAcceptRefusalAnswer({ statusCode: 409 }))).toBe(true);
	});

	it.each([[inviteAcceptRefusalAnswer({ statusCode: 400 })], [undefined], [null], ['text']])(
		'finds none in %p',
		(answer) => {
			expect(carriesSignInFirstCode(answer)).toBe(false);
		}
	);
});

describe('isSignInFirstError', () => {
	const answer = inviteAcceptRefusalAnswer({ statusCode: 409 });

	it("reads the code from the API client's own error", () => {
		const refused = ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 400',
			status: 400,
			response: { status: 400, data: answer }
		});

		expect(isSignInFirstError(refused)).toBe(true);
	});

	it('reads the code from a raw request error', () => {
		expect(isSignInFirstError({ response: { status: 400, data: answer } })).toBe(true);
	});

	it.each([
		['an invalid code', ApiErrorService.fromAxiosError({ status: 400, response: { status: 400, data: { errors: {} } } })],
		['a network failure', new Error('Network Error')],
		['nothing', undefined]
	])('finds none in %s', (_case, error) => {
		expect(isSignInFirstError(error)).toBe(false);
	});
});
