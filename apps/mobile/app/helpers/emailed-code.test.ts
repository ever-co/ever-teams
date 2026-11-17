import { EMAILED_CODE_LENGTH, isCompleteEmailedCode, normalizeEmailedCode, pastedEmailedCode } from './emailed-code';

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

describe('a typed or pasted code', () => {
	it('keeps the code when spaces come around it', () => {
		expect(normalizeEmailedCode(' 7F016A5O ')).toBe('7F016A5O');
		expect(normalizeEmailedCode('7F016A5O\n')).toBe('7F016A5O');
	});

	it('keeps no more characters than the field has cells', () => {
		expect(normalizeEmailedCode('7F016A5O99')).toBe('7F016A5O');
		expect(normalizeEmailedCode('7F016A5O', 6)).toBe('7F016A');
	});

	it('is empty for a missing text', () => {
		expect(normalizeEmailedCode(null)).toBe('');
		expect(normalizeEmailedCode(undefined)).toBe('');
	});
});

describe('a pasted code', () => {
	it('fills the cells with a code pasted with spaces around it', () => {
		expect(pastedEmailedCode(' 7f016a5o ')).toBe('7F016A5O');
		expect(pastedEmailedCode('7F016A\n')).toBe('7F016A');
	});

	it('leaves the cells alone for a text that is not a whole code', () => {
		expect(pastedEmailedCode('7F016A5')).toBeNull();
		expect(pastedEmailedCode('7F01-6A5')).toBeNull();
		expect(pastedEmailedCode('7F 016A5')).toBeNull();
		expect(pastedEmailedCode('')).toBeNull();
		expect(pastedEmailedCode(null)).toBeNull();
	});

	it('leaves the cells alone when the code has more characters than the field has cells', () => {
		expect(pastedEmailedCode('7F016A5O', 6)).toBeNull();
	});
});
