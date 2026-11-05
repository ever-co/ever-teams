import { isStrongPassword, minLength } from 'class-validator';
import { meetsPasswordMinLength, PASSWORD_MIN_LENGTH, unmetResetPasswordRulesOf } from './password-strength';

/** Gauzy's ChangePasswordRequestDTO: MinLength(8) and IsStrongPassword with these options. */
const GAUZY_STRONG_PASSWORD = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 };

function gauzyAcceptsForReset(password: string) {
	const isLongEnough = minLength(password, 8);
	const isStrong = isStrongPassword(password, GAUZY_STRONG_PASSWORD);
	return isLongEnough && isStrong;
}

describe('password minimum length', () => {
	it('follows the app password policy', () => {
		expect(PASSWORD_MIN_LENGTH).toBe(8);
	});

	it('refuses a password one character short of it', () => {
		expect(meetsPasswordMinLength('1234567')).toBe(false);
		expect(meetsPasswordMinLength('12345678')).toBe(true);
	});
});

describe('reset password rules', () => {
	it.each([
		['Abcdef1!', []],
		['abcdef1!', ['uppercase']],
		['ABCDEF1!', ['lowercase']],
		['Abcdefg!', ['digit']],
		['Abcdefg1', ['symbol']],
		['Ab1!', ['minLength']],
		['', ['minLength', 'uppercase', 'lowercase', 'digit', 'symbol']]
	])('lists what %p still misses', (password, missing) => {
		expect(unmetResetPasswordRulesOf(password)).toEqual(missing);
	});

	it.each([
		'Abcdef1!',
		'Abcdef1 ',
		'Pass£word1',
		'Pass€word1',
		'Pässwörd1!',
		'ÄBCDEFG1!',
		'abcdéfg1!',
		'Ab1!😀😀😀😀',
		'Ab1!😀😀😀',
		'Ab1!x️x️x️x',
		'Aa1~`{}[]',
		'Aa1\\/<>?,.',
		'Abcdefgh'
	])('agrees with Gauzy on %p', (password) => {
		const isAccepted = unmetResetPasswordRulesOf(password).length === 0;

		expect(isAccepted).toBe(gauzyAcceptsForReset(password));
	});
});
