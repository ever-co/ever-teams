import { useEffect, useState } from 'react';
import { changeTeamsLanguage } from '@components/i18n/language-switch';

/**
 * The language of a TeamsProvider: `lang`, or the language saved earlier on this site.
 */
export function useProviderLanguage(lang: string) {
	const [language, setLanguage] = useState(lang);

	useEffect(() => {
		const storedLanguage = localStorage.getItem('preferred-language');
		if (storedLanguage) {
			setLanguage(storedLanguage);
		}
	}, [lang]);

	useEffect(() => {
		changeTeamsLanguage(language);
	}, [language]);
}
