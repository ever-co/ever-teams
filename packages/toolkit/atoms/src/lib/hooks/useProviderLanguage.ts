import { useEffect, useRef, useState } from 'react';
import i18n from '@lib/i18n/init';

/**
 * The language of a TeamsProvider: at mount, the language a person picked earlier on this site in the language switch,
 * else `lang`; a `lang` the host changes afterwards applies at once. Only the switch saves a language: the provider
 * never saves `lang`, so the `lang` of another page of the site still applies there.
 */
export function useProviderLanguage(lang: string) {
	const [language, setLanguage] = useState(lang);
	const appliedLang = useRef(lang);

	useEffect(() => {
		const storedLanguage = localStorage.getItem('preferred-language');
		if (storedLanguage) {
			setLanguage(storedLanguage);
		}
	}, []);

	useEffect(() => {
		if (appliedLang.current === lang) {
			return;
		}
		appliedLang.current = lang;
		setLanguage(lang);
		// Applied here too: the language switch changes the kit's language without this state, which may already hold lang
		i18n.changeLanguage(lang);
	}, [lang]);

	useEffect(() => {
		i18n.changeLanguage(language);
	}, [language]);
}
