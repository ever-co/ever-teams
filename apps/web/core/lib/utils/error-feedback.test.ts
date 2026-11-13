import { ApiErrorService } from '@/core/services/client/api-error.service';
import { errorReasonKeyOf, errorReasonOf, isNameTakenError } from './error-feedback';

/** Gauzy's answer to a team label named like another label of the team (ever-co/ever-gauzy#11782). */
const NAME_TAKEN_BODY = {
	statusCode: 409,
	error: 'Conflict',
	message: 'A tag named "Bug" already exists here.',
	code: 'UNIQUE_CONSTRAINT_VIOLATION',
	details: { field: 'name' }
};

function axiosErrorOf(status: number, data: Record<string, unknown>) {
	return {
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data, headers: {}, status, statusText: '' }
	};
}

describe('isNameTakenError', () => {
	it('reads Gauzy refusing a name, as the API service throws it', () => {
		const error = ApiErrorService.fromAxiosError(axiosErrorOf(409, NAME_TAKEN_BODY));

		expect(isNameTakenError(error)).toBe(true);
	});

	it('reads it from a raw Axios error and from the bare body too', () => {
		expect(isNameTakenError(axiosErrorOf(409, NAME_TAKEN_BODY))).toBe(true);
		expect(isNameTakenError(NAME_TAKEN_BODY)).toBe(true);
	});

	it('leaves a uniqueness refusal on another field, a 409 of another kind and other statuses alone', () => {
		const otherField = { ...NAME_TAKEN_BODY, details: { field: 'code' } };
		const otherConflict = { statusCode: 409, error: 'Conflict', message: 'Changed meanwhile', code: 'CONFLICT' };
		const notAConflict = { ...NAME_TAKEN_BODY, statusCode: 400 };

		expect(isNameTakenError(ApiErrorService.fromAxiosError(axiosErrorOf(409, otherField)))).toBe(false);
		expect(isNameTakenError(ApiErrorService.fromAxiosError(axiosErrorOf(409, otherConflict)))).toBe(false);
		expect(isNameTakenError(ApiErrorService.fromAxiosError(axiosErrorOf(400, notAConflict)))).toBe(false);
		expect(isNameTakenError(new Error('Network Error'))).toBe(false);
		expect(isNameTakenError(undefined)).toBe(false);
	});
});

describe('errorReasonOf, for a name Gauzy finds taken', () => {
	it('says the name is taken instead of a change made at the same time', () => {
		const error = ApiErrorService.fromAxiosError(axiosErrorOf(409, NAME_TAKEN_BODY));

		expect(errorReasonOf(error)).toBe('nameTaken');
		expect(errorReasonKeyOf(error)).toBe('toasts.REASONS.NAME_TAKEN');
	});

	it('keeps the conflict reason for any other 409', () => {
		const error = ApiErrorService.fromAxiosError(
			axiosErrorOf(409, { statusCode: 409, message: 'Changed meanwhile' })
		);

		expect(errorReasonOf(error)).toBe('conflict');
	});
});
