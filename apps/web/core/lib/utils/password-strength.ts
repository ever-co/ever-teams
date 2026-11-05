import { PASSWORD_MINIMUM_LENGTH } from '@ever-teams/constants';

/** The app's password policy: Gauzy's reset and registration refuse anything shorter. */
export const PASSWORD_MIN_LENGTH = PASSWORD_MINIMUM_LENGTH;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const LONG_PASSWORD_LENGTH = 10;
const VARIED_PASSWORD_LENGTH = 8;

function characterKindsOf(password: string) {
	const hasLowercase = /[a-z]/.test(password);
	const hasUppercase = /[A-Z]/.test(password);
	const hasDigit = /\d/.test(password);
	const hasSymbol = /[^a-zA-Z\d]/.test(password);
	const kinds = [hasLowercase, hasUppercase, hasDigit, hasSymbol];
	return kinds.filter(Boolean).length;
}

/**
 * A rough strength for the meter of a new password: 0 when empty, 1 under the minimum length, then one more step for
 * length and for the variety of characters. A hint for the person, never a rule: only the minimum length is enforced.
 */
export function passwordStrengthOf(password: string): PasswordStrength {
	if (!password) {
		return 0;
	}
	if (password.length < PASSWORD_MIN_LENGTH) {
		return 1;
	}
	const kinds = characterKindsOf(password);
	const isLong = password.length >= LONG_PASSWORD_LENGTH;
	const isVaried = kinds >= 2;
	const isLongEnoughForVariety = password.length >= VARIED_PASSWORD_LENGTH;
	const isVeryVaried = kinds >= 3 && isLongEnoughForVariety;
	let strength = 1;
	if (isLong) {
		strength += 1;
	}
	if (isVaried) {
		strength += 1;
	}
	if (isVeryVaried) {
		strength += 1;
	}
	return Math.min(strength, 4) as PasswordStrength;
}

export function meetsPasswordMinLength(password: string) {
	return password.length >= PASSWORD_MIN_LENGTH;
}

export function passwordsMatch(password: string, confirmation: string) {
	const hasConfirmation = confirmation.length > 0;
	return hasConfirmation && password === confirmation;
}
