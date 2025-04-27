import { AUTHENTICATION_ERROR_MESSAGES, PASSWORD_CRITERIA, PASSWORD_MINIMUM_LENGTH } from '@ever-teams/constants';
import { AuthErrorAlertType, AuthErrorDetails } from '@ever-teams/types';
import { AuthErrorCode } from '@ever-teams/types';
import { PasswordValidationResult } from '@ever-teams/types';
import zxcvbn from 'zxcvbn';

/* -------------------------------------------------------------------------- */
/*                           Password Validation Utils                        */
/* -------------------------------------------------------------------------- */

/**
 * Check if a password satisfies all the defined password criteria.
 */
export const isPasswordCompliant = (password: string): boolean =>
	PASSWORD_CRITERIA.every((criterion) => criterion.regex.test(password));

/**
 * Evaluate the strength of a password based on entropy and criteria.
 */
export const evaluatePasswordStrength = (password: string): PasswordValidationResult => {
	if (!password || password.trim().length === 0) {
		return PasswordValidationResult.EMPTY;
	}

	if (password.length < PASSWORD_MINIMUM_LENGTH) {
		return PasswordValidationResult.LENGTH_TOO_SHORT;
	}

	const criteriaMet = PASSWORD_CRITERIA.every((criterion) => criterion.regex.test(password));
	const entropyScore = zxcvbn(password).score;

	if (!criteriaMet || entropyScore <= 2) {
		return PasswordValidationResult.DOES_NOT_MEET_CRITERIA;
	}

	return PasswordValidationResult.VALID;
};

/**
 * Retrieve full information for a specific authentication error code.
 */
export const getAuthenticationErrorDetails = (code: AuthErrorCode, email?: string): AuthErrorDetails | undefined => {
	const alertableErrorCodes: AuthErrorCode[] = [
		AuthErrorCode.SIGNUP_DISABLED,
		AuthErrorCode.INVALID_PASSWORD,
		AuthErrorCode.INVALID_EMAIL,
		AuthErrorCode.EMAIL_REQUIRED,
		// TODO: Add other error codes if needed
	];

	if (alertableErrorCodes.includes(code)) {
		const errorInfo = AUTHENTICATION_ERROR_MESSAGES[code];
		return {
			type: AuthErrorAlertType.BANNER,
			code,
			title: errorInfo?.title ?? 'Authentication Error',
			message: errorInfo?.message(email) ?? 'An unexpected error occurred. Please try again.',
		};
	}

	return undefined;
};
