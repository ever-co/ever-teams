import { AuthErrorCode, AuthErrorMessageMap, PasswordValidationCriterion } from '@ever-teams/types';

/* -------------------------------------------------------------------------- */
/*                               Password Policy                              */
/* -------------------------------------------------------------------------- */

/**
 * Minimum password length required across Ever Teams.
 */
export const PASSWORD_MINIMUM_LENGTH = 8;
/**
 * Core password criteria for Ever Teams user authentication.
 */
export const PASSWORD_CRITERIA: PasswordValidationCriterion[] = [
	{ regex: /[a-z]/, description: 'At least one lowercase letter' },
	{ regex: /[A-Z]/, description: 'At least one uppercase letter' },
	{ regex: /[0-9]/, description: 'At least one number' },
	{ regex: /[^a-zA-Z0-9]/, description: 'At least one special character' },
];

/* -------------------------------------------------------------------------- */
/*                            Authentication Errors                           */
/* -------------------------------------------------------------------------- */

/**
 * Standardized mapping of authentication errors to messages.
 */
export const AUTHENTICATION_ERROR_MESSAGES: AuthErrorMessageMap = {
	[AuthErrorCode.INSTANCE_NOT_CONFIGURED]: {
		title: 'Instance not configured',
		message: () => 'Instance not configured. Please contact your administrator.',
	},
	[AuthErrorCode.SIGNUP_DISABLED]: {
		title: 'Sign up disabled',
		message: () => 'Sign up is currently disabled. Please contact support.',
	},
	[AuthErrorCode.INVALID_PASSWORD]: {
		title: 'Invalid password',
		message: () => 'Your password is incorrect. Please try again.',
	},
	[AuthErrorCode.SMTP_NOT_CONFIGURED]: {
		title: 'SMTP not configured',
		message: () => 'Email service is not configured. Contact your administrator.',
	},
	[AuthErrorCode.INVALID_EMAIL]: {
		title: 'Invalid email address',
		message: () => 'Please enter a valid email address.',
	},
	[AuthErrorCode.EMAIL_REQUIRED]: {
		title: 'Email required',
		message: () => 'Email address is required. Please provide one.',
	},
	// TODO: Add here other error specification...
};
