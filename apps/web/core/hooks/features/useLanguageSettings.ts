'use client';

import { APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';
import { getActiveLanguageIdCookie, setActiveLanguageIdCookie } from '@/core/lib/helpers/cookies';
import { getLanguageListAPI } from '@/core/services/client/api';
import {
	activeLanguageIdState,
	activeLanguageState,
	languageListState,
	languagesFetchingState,
	userState
} from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useLanguage } from '../useLanguage';
import { useQuery } from '../useQuery';

export function useLanguageSettings() {
	const [user] = useAtom(userState);
	const { loading, queryCall } = useQuery(getLanguageListAPI);
	const [languages, setLanguages] = useAtom(languageListState);
	const { changeLanguage } = useLanguage();
	const activeLanguage = useAtomValue(activeLanguageState);
	const [, setActiveLanguageId] = useAtom(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useAtom(languagesFetchingState);
	const { firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	useEffect(() => {
		setLanguagesFetching(loading);
	}, [loading, setLanguagesFetching]);
	// Update language in rerender
	useEffect(() => {
		const language = user?.preferredLanguage || window.localStorage.getItem('preferredLanguage');
		if (language) {
			changeLanguage(language);
		}
	}, [changeLanguage, user]);

	const loadLanguagesData = useCallback(() => {
		setActiveLanguageId(getActiveLanguageIdCookie());
		return queryCall(user?.role?.isSystem ?? false).then((res) => {
			setLanguages(res?.data?.items.filter((item: any) => APPLICATION_LANGUAGES_CODE.includes(item.code)) || []);
			return res;
		});
	}, [queryCall, setActiveLanguageId, setLanguages, user]);

	const setActiveLanguage = useCallback(
		(languageId: (typeof languages)[0]) => {
			changeLanguage(languageId.code);
			setActiveLanguageIdCookie(languageId.code);
			setActiveLanguageId(languageId.code);
		},
		[setActiveLanguageId, changeLanguage]
	);

	return {
		loadLanguagesData,
		loading,
		languages,
		languagesFetching,
		activeLanguage,
		setActiveLanguage,
		firstLoadLanguagesData
	};
}
