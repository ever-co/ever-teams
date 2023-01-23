import {
	getActiveLanguageIdCookie,
	setActiveLanguageIdCookie,
} from '@app/helpers/cookies';
import {
	getLanguageListAPI,
} from '@app/services/client/api';
import {
	activeLanguageIdState,
	languagesFetchingState,
    activeLanguageState,
    languageListState,
    userState
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
	const [activeLanguageId, setActiveLanguageId] = useRecoilState(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useRecoilState(languagesFetchingState);
	const { firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	useEffect(() => {
		setLanguagesFetching(loading);
	}, [loading, setLanguagesFetching]);

	const loadLanguagesData = useCallback(() => {
		setActiveLanguageId(getActiveLanguageIdCookie());
        if (user) {
            return queryCall(user?.role.isSystem).then((res) => {
                setLanguages(res.data.items || []);
                return res;
            });
        }
	}, [queryCall, setActiveLanguageId, setLanguages]);

	const setActiveLanguage = useCallback(
		(langauegId: typeof languages[0]) => {
			setActiveLanguageIdCookie(langauegId.id);
			setActiveLanguageId(langauegId.id);
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