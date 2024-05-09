'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { currentLanguageState } from '@app/stores';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';

export function useLanguage() {
	const router = useRouter();
	const [currentLanguage, setCurrentLanguage] = useRecoilState(currentLanguageState);

	useEffect(() => {
		const userSelectedLanguage = window.localStorage.getItem('preferredLanguage') || 'en';
		setCurrentLanguage(userSelectedLanguage);
	}, []);
	// TODO Language
	const changeLanguage = useCallback(
		(newLanguage: string, forceRedirect = false) => {
			setCurrentLanguage(newLanguage);
			// i18n.changeLanguage(newLanguage);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('preferredLanguage', newLanguage);
			}
			if (forceRedirect) {
				// Navigation to force rerender
				// router.push({ pathname: router.pathname, query: router.query }, undefined, { locale: newLanguage });
			}
			// router.refresh();
		},
		[router]
	);
	return { currentLanguage, changeLanguage,};
}
