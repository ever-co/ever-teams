import { validateForm } from './validations';

jest.mock('@/core/constants/config/constants', () => ({
	AUTH_CODE_LENGTH: 8,
	RECAPTCHA_SITE_KEY: undefined,
	smtpConfiguration: jest.fn()
}));

describe('validateForm', () => {
	it('accepts an email with surrounding whitespace and stores it trimmed', () => {
		const data = { email: '  me@example.com ' };

		const result = validateForm(['email'], data);

		expect(result.isValid).toBe(true);
		expect(result.errors).toEqual({});
		expect(data.email).toBe('me@example.com');
	});

	it('accepts a phone number and a URL with surrounding whitespace', () => {
		const data = { phone: ' 555-123-4567 ', url: ' https://ever.team\n' };

		const result = validateForm(['phone', 'url'], data);

		expect(result.isValid).toBe(true);
		expect(data).toEqual({ phone: '555-123-4567', url: 'https://ever.team' });
	});

	it('still rejects a malformed email', () => {
		const result = validateForm(['email'], { email: ' not-an-email ' });

		expect(result.isValid).toBe(false);
		expect(result.errors.email).toBe('Please provide a valid email address');
	});

	it('still rejects a malformed phone number and URL', () => {
		const result = validateForm(['phone', 'url'], { phone: 'abc', url: 'not a url' });

		expect(result.isValid).toBe(false);
		expect(result.errors.phone).toBe('Please provide a valid phone number');
		expect(result.errors.url).toBe('Please provide a valid URL');
	});

	it('still asks for a value when a field is empty, blank or a single character', () => {
		const result = validateForm(['email', 'name', 'code'], { email: '', name: '   ', code: 'a' });

		expect(result.isValid).toBe(false);
		expect(result.errors.email).toBe('Please make sure to fill out this field');
		expect(result.errors.name).toBe('Please make sure to fill out this field');
		expect(result.errors.code).toBe('Please make sure to fill out this field');
	});

	it('passes plain valid fields', () => {
		const result = validateForm(['name', 'code'], { name: 'Ada', code: '12345678' });

		expect(result).toEqual({ errors: {}, isValid: true });
	});
});
