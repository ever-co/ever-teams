import { PASSWORD_MINIMUM_LENGTH } from '@ever-teams/constants';
import { meetsPasswordMinLength, PASSWORD_MIN_LENGTH } from './password-strength';

describe('password minimum length', () => {
	it('follows the app password policy', () => {
		expect(PASSWORD_MIN_LENGTH).toBe(PASSWORD_MINIMUM_LENGTH);
		expect(PASSWORD_MIN_LENGTH).toBe(8);
	});

	it('refuses a password one character short of it', () => {
		expect(meetsPasswordMinLength('1234567')).toBe(false);
		expect(meetsPasswordMinLength('12345678')).toBe(true);
	});
});
