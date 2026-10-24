/**
 * The sign-up details and the sign-up itself ask the Gauzy API for the same language (the page's, when the API has
 * it), since the API checks the accepted documents in that language.
 */
import { everIdLanguage } from './language';

describe('everIdLanguage', () => {
	it.each([
		['fr', 'fr'],
		['pt-BR', 'pt'],
		['ZH_cn', 'zh'],
		[' de ', 'de'],
		['sv', 'en'],
		['fr;drop', 'en'],
		['', 'en'],
		[undefined, 'en'],
		[42, 'en']
	])('asks for %p as %p', (locale, language) => {
		expect(everIdLanguage(locale)).toBe(language);
	});
});
