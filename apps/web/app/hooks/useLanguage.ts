/* eslint-disable react-hooks/exhaustive-deps */
import { currentLanguageState } from '@app/stores';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';

export function useLanguage() {
	const { i18n } = useTranslation();
	const router = useRouter();
	const [currentLanguage, setCurrentLanguage] = useRecoilState(currentLanguageState);

	useEffect(() => {
		const userSelectedLanguage = window.localStorage.getItem('preferredLanguage') || 'en';
		setCurrentLanguage(userSelectedLanguage);
	}, []);
	const changeLanguage = useCallback(
		(newLanguage: string, forceRedirect = false) => {
			setCurrentLanguage(newLanguage);
			i18n.changeLanguage(newLanguage);
			// Make sure translation files are loaded
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('preferredLanguage', newLanguage);
			}
			if (forceRedirect) {
				// Navigation to force rerender
				router.push({ pathname: router.pathname, query: router.query }, undefined, { locale: newLanguage });
			}
		},
		[router, i18n]
	);
	return { currentLanguage, changeLanguage, i18n };
}
