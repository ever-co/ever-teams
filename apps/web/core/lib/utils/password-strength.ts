import { minLength } from 'class-validator';

/**
 * The app's password policy: Gauzy's reset and registration refuse anything shorter. Same value as
 * `PASSWORD_MINIMUM_LENGTH` in packages/constants; not imported from there because that package's types are only
 * built into dist/ by `turbo build`, so `tsc --noEmit` on the web app alone (the before-merge gate) cannot resolve it.
 */
export const PASSWORD_MIN_LENGTH = 8;

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

/**
 * Gauzy's reset rule, `MinLength(8)` and `IsStrongPassword` in its ChangePasswordRequestDTO. validator.js counts only
 * A-Z, a-z, 0-9 and this symbol set, so an accented letter or a euro sign fills none of them.
 */
const UPPERCASE_LETTER = /[A-Z]/;
const LOWERCASE_LETTER = /[a-z]/;
const DIGIT = /[0-9]/;
const RESET_SYMBOL = /[-#!$@£%^&*()_+|~=`{}[\]:";'<>?,./\\ ]/;

export type ResetPasswordRule = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'symbol';

export const RESET_PASSWORD_RULES: readonly ResetPasswordRule[] = [
	'minLength',
	'uppercase',
	'lowercase',
	'digit',
	'symbol'
];

const RESET_RULE_TESTS: Record<ResetPasswordRule, (password: string) => boolean> = {
	minLength: (password) => minLength(password, PASSWORD_MIN_LENGTH),
	uppercase: (password) => UPPERCASE_LETTER.test(password),
	lowercase: (password) => LOWERCASE_LETTER.test(password),
	digit: (password) => DIGIT.test(password),
	symbol: (password) => RESET_SYMBOL.test(password)
};

export function meetsResetPasswordRule(password: string, rule: ResetPasswordRule) {
	const test = RESET_RULE_TESTS[rule];
	return test(password);
}

/** The reset rules a password still misses, in the order the form lists them. */
export function unmetResetPasswordRulesOf(password: string) {
	return RESET_PASSWORD_RULES.filter((rule) => !meetsResetPasswordRule(password, rule));
}
