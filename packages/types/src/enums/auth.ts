/**
 * Different alert types for authentication errors.
 */
export enum AuthErrorAlertType {
	BANNER = 'banner',
	TOAST = 'toast',
	MODAL = 'modal',
}

/**
 * Password strength.
 */
export enum PasswordStrength {
	EMPTY = 'empty',
	WEAK = 'weak',
	FAIR = 'fair',
	GOOD = 'good',
	STRONG = 'strong',
}

/**
 * User permissions.
 */
export const USER_PERMISSIONS = {
	ADMIN: 'admin',
	MEMBER: 'member',
	GUEST: 'guest',
} as const;

/**
 * User roles.
 */
export const USER_ROLES = {
	ADMIN: 'admin',
	MEMBER: 'member',
	GUEST: 'guest',
} as const;

/**
 * List of possible authentication error codes across the app.
 */
export enum AuthErrorCode {
	SIGNUP_DISABLED = 'SIGNUP_DISABLED',
	INVALID_PASSWORD = 'INVALID_PASSWORD',
	INVALID_EMAIL = 'INVALID_EMAIL',
	EMAIL_REQUIRED = 'EMAIL_REQUIRED',
	// 👉 TO DO: Add here all other codes of your system (MAGIC LINK, OAUTH, RESET PASSWORD, etc.)
}

/**
 * Password validation possible outcomes.
 */
export enum PasswordValidationResult {
	EMPTY = 'EMPTY',
	LENGTH_TOO_SHORT = 'LENGTH_TOO_SHORT',
	DOES_NOT_MEET_CRITERIA = 'DOES_NOT_MEET_CRITERIA',
	VALID = 'VALID',
}
