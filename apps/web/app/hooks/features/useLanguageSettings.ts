import {
	getActiveLanguageIdCookie,
	setActiveLanguageIdCookie,
} from '@app/helpers/cookies';
import { getLanguageListAPI } from '@app/services/client/api';
import {
	activeLanguageIdState,
	languagesFetchingState,
	activeLanguageState,
	languageListState,
	userState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useLanguageSettings() {
	const [user] = useRecoilState(userState);
	const { loading, queryCall } = useQuery(getLanguageListAPI);
	const [languages, setLanguages] = useRecoilState(languageListState);
	const activeLanguage = useRecoilValue(activeLanguageState);
	const [, setActiveLanguageId] = useRecoilState(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useRecoilState(
		languagesFetchingState
	);
	const { firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	useEffect(() => {
		setLanguagesFetching(loading);
	}, [loading, setLanguagesFetching]);

	const loadLanguagesData = useCallback(() => {
		setActiveLanguageId(getActiveLanguageIdCookie());
		if (user) {
			return queryCall(user.role.isSystem).then((res) => {
				setLanguages(
					res?.data?.data?.items.filter((item) => item.name === 'English') || []
				);
				return res;
			});
		}
	}, [queryCall, setActiveLanguageId, setLanguages, user]);

	const setActiveLanguage = useCallback(
		(languageId: typeof languages[0]) => {
			setActiveLanguageIdCookie(languageId.code);
			setActiveLanguageId(languageId.code);
		},
		[setActiveLanguageId]
	);

	return {
		loadLanguagesData,
		loading,
		languages,
		languagesFetching,
		activeLanguage,
		setActiveLanguage,
		firstLoadLanguagesData,
	};
}
