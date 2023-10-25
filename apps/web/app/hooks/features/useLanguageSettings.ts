import { APPLICATION_LANGUAGES_CODE } from '@app/constants';
import { getActiveLanguageIdCookie, setActiveLanguageIdCookie } from '@app/helpers/cookies';
import { getLanguageListAPI } from '@app/services/client/api';
import {
	activeLanguageIdState,
	activeLanguageState,
	languageListState,
	languagesFetchingState,
	userState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useLanguage } from '../useLanguage';
import { useQuery } from '../useQuery';

export function useLanguageSettings() {
	const [user] = useRecoilState(userState);
	const { loading, queryCall } = useQuery(getLanguageListAPI);
	const [languages, setLanguages] = useRecoilState(languageListState);
	const { changeLanguage } = useLanguage();
	const activeLanguage = useRecoilValue(activeLanguageState);
	const [, setActiveLanguageId] = useRecoilState(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useRecoilState(languagesFetchingState);
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
	}, []);
	const loadLanguagesData = useCallback(() => {
		setActiveLanguageId(getActiveLanguageIdCookie());
		if (user) {
			return queryCall(user.role.isSystem).then((res) => {
				setLanguages(
					res?.data?.data?.items.filter((item) => APPLICATION_LANGUAGES_CODE.includes(item.code)) || []
				);
				return res;
			});
		}
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
