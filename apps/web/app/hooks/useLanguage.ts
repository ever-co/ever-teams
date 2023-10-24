/* eslint-disable react-hooks/exhaustive-deps */
import { currentLanguageState } from '@app/stores';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';

export function useLanguage() {
	const { i18n } = useTranslation();
	const router = useRouter();
	const [currentLanguage, setCurrentLanguage] = useRecoilState(currentLanguageState);
	const changeLanguage = useCallback(
		(newLanguage: string, forceRedirect = false) => {
			setCurrentLanguage(newLanguage);
			i18n.changeLanguage(newLanguage);
			// Make sure translation files are loaded
			i18n.loadNamespaces(currentLanguage);
			if (forceRedirect) {
				// Navigation to force rerender
				router.push({ pathname: router.pathname, query: router.query }, undefined, { locale: newLanguage });
			}
		},
		[router, i18n]
	);
	return { currentLanguage, changeLanguage, i18n };
}
