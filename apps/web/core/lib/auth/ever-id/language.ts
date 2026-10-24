/**
 * The language the Gauzy API is asked to use for the documents of an Ever ID sign-up (its `language` header): the
 * page's locale when the API has it, English otherwise. The sign-up details and the sign-up itself must use the
 * same one, since the API checks the accepted documents in that language.
 */

/** The languages of the Gauzy API (the same as this app's locales). */
const API_LANGUAGES = new Set(['en', 'bg', 'he', 'ru', 'fr', 'es', 'zh', 'de', 'pt', 'it', 'nl', 'pl', 'ar']);

/** The API language for a locale such as `fr` or `pt-BR`; `en` for anything else. */
export function everIdLanguage(locale: unknown): string {
	if (typeof locale !== 'string') return 'en';
	const language = locale.trim().toLowerCase().split(/[-_]/)[0];
	return API_LANGUAGES.has(language) ? language : 'en';
}
