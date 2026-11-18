import { useEffect, useRef, useState } from 'react';
import { changeTeamsLanguage } from '@components/i18n/language-switch';

/**
 * The language of a TeamsProvider: at mount, the language saved earlier on this site, else `lang`; a `lang` the host
 * changes afterwards applies at once.
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
	}, [lang]);

	useEffect(() => {
		changeTeamsLanguage(language);
	}, [language]);
}
