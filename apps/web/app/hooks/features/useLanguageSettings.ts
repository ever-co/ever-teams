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
	const { firstLoad, firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	// const { createOrganizationTeam, loading: createOTeamLoading } =
	// 	useCreateOrganizationTeam();

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
			// setOrganizationIdCookie(langauegId.organizationId);
			// This must be called at the end (Update store)
			setActiveLanguageId(langauegId.id);
		},
		[setActiveLanguageId]
	);

	useEffect(() => {
		if (activeLanguageId && firstLoad) {
			// getOrganizationTeamAPI(activeLanguageId).then((res) => {
			// 	const members = res.data?.members;
			// 	const id = res.data.id;
			// 	if (!members) return;

			// 	// Update active languages fields with from team Status API
			// 	setLanguages((tms) => {
			// 		const idx_tm = tms.findIndex((t) => t.id === id);
			// 		if (idx_tm < 0) return tms;
			// 		const new_tms = [...tms];
			// 		new_tms[idx_tm] = { ...new_tms[idx_tm] };
			// 		const new_members = [...new_tms[idx_tm].members];
			// 		// merges status fields for a members
			// 		new_members.forEach((mem, i) => {
			// 			const new_mem = members.find((m) => m.id === mem.id);
			// 			if (!new_mem) return;
			// 			new_members[i] = { ...mem, ...new_mem };
			// 		});
			// 		// Update members for a team
			// 		new_tms[idx_tm].members = new_members;
			// 		return new_tms;
			// 	});
			// });
		}
	}, [activeLanguageId, firstLoad, setLanguages]);

	return {
		loadLanguagesData,
		loading,
		languages,
		languagesFetching,
		activeLanguage,
		setActiveLanguage,
		// createOrganizationTeam,
		// createOTeamLoading,
		firstLoadLanguagesData,
	};
}