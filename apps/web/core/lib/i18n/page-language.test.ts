import { languageNameOf, pageLanguageCodeOf } from './page-language';

jest.mock('@/core/constants/config/constants', () => ({
	APPLICATION_LANGUAGES_CODE: ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es']
}));

describe('pageLanguageCodeOf (#5692)', () => {
	it.each([
		['/de/auth/passcode', 'de'],
		['/ar/auth/passcode', 'ar'],
		['/fr', 'fr'],
		['/auth/passcode', 'en'],
		['/', 'en'],
		['/my/tasks', 'en'],
		[null, 'en'],
		[undefined, 'en']
	])('reads %p as %p', (pathname, code) => {
		expect(pageLanguageCodeOf(pathname)).toBe(code);
	});
});

describe('languageNameOf', () => {
	it.each([
		['de', 'German'],
		['ar', 'Arabic'],
		['en', 'English'],
		['zh', 'Chinese']
	])('names %p %p', (code, name) => {
		expect(languageNameOf(code)).toBe(name);
	});

	it('falls back to English for a code that is no language', () => {
		expect(languageNameOf('not a code')).toBe('English');
	});
});
