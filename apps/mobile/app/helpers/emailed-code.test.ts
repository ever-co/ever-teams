import { EMAILED_CODE_LENGTH, isCompleteEmailedCode } from './emailed-code';

describe('emailed codes', () => {
	it('fills as many cells as a current server sends characters', () => {
		expect(EMAILED_CODE_LENGTH).toBe(8);
	});

	it('accepts the 8 characters a current server sends', () => {
		expect(isCompleteEmailedCode('7F016A5O')).toBe(true);
	});

	it('accepts the 6 characters an earlier server sends', () => {
		expect(isCompleteEmailedCode('7F016A')).toBe(true);
	});

	it('waits while the code is still being typed', () => {
		expect(isCompleteEmailedCode('7F016A5')).toBe(false);
		expect(isCompleteEmailedCode('7F0')).toBe(false);
	});

	it('ignores the spaces around a pasted code', () => {
		expect(isCompleteEmailedCode(' 7F016A5O ')).toBe(true);
	});

	it('treats a missing code as incomplete', () => {
		expect(isCompleteEmailedCode('')).toBe(false);
		expect(isCompleteEmailedCode(null)).toBe(false);
		expect(isCompleteEmailedCode(undefined)).toBe(false);
	});
});
