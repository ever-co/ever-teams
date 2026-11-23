import { APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';

const DEFAULT_LANGUAGE_CODE = 'en';
const DEFAULT_LANGUAGE_NAME = 'English';

/** The language a page is in, from its address: `/de/auth/passcode` is German, a page without a prefix is English. */
export function pageLanguageCodeOf(pathname: string | null | undefined): string {
	const [firstSegment] = (pathname ?? '').split('/').filter(Boolean);
	const isLanguagePrefix = firstSegment !== undefined && APPLICATION_LANGUAGES_CODE.includes(firstSegment);
	if (!isLanguagePrefix) {
		return DEFAULT_LANGUAGE_CODE;
	}
	return firstSegment;
}

/**
 * The English name of a language, as the list of languages names them ("German", "Arabic"), for a menu whose list is
 * not loaded yet (#5692).
 */
export function languageNameOf(code: string): string {
	try {
		const names = new Intl.DisplayNames([DEFAULT_LANGUAGE_CODE], { type: 'language' });
		return names.of(code) ?? DEFAULT_LANGUAGE_NAME;
	} catch {
		return DEFAULT_LANGUAGE_NAME;
	}
}
