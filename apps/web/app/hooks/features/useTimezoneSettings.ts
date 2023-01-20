// import {
// 	getActiveTimezoneIdCookie,
// 	setActiveTimezoneIdCookie,
// } from '@app/helpers/cookies';
// import {
// 	getTimezoneListAPI,
// } from '@app/services/client/api';
import {
    activeTimezoneState,
    timezoneListState,
    userState,
    activeTimezoneIdState,
    timezonesFetchingState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
// import { useFirstLoad } from '../useFirstLoad';
// import { useQuery } from '../useQuery';
import timeZones from '@components/pages/settings/timezones';

export function useTimezoneSettings() {
    const [user] = useRecoilState(userState);
	// const { loading, queryCall } = useQuery(getTimezoneListAPI);
	const [timezones, setTimezone] = useRecoilState(timezoneListState);
	const activeTimezone = useRecoilValue(activeTimezoneState);
	const [activeTimezoneId, setActiveTimezoneId] = useRecoilState(activeTimezoneIdState);
	const [timezonesFetching, setTimezoneFetching] = useRecoilState(timezonesFetchingState);
	// const { firstLoad, firstLoadData: firstLoadTimezonesData } = useFirstLoad();

	// const { createOrganizationTeam, loading: createOTeamLoading } =
	// 	useCreateOrganizationTeam();
	useEffect(() => {
		// setTimezoneFetching(loading);
        setTimezone(timeZones);
	}, [setTimezoneFetching, activeTimezone]);

	// const loadTimezonesData = useCallback(() => {
	// 	// setActiveTimezoneId(getActiveTimezoneIdCookie());
    //     if (user) {
    //         return queryCall(user?.role.isSystem).then((res) => {
    //             setTimezone(res.data.items || []);
    //             return res;
    //         });
    //     }
	// }, [queryCall, setActiveTimezoneId, setTimezone]);

	const setActiveTimezone = useCallback(
		(timezoneId: typeof timezones[0]) => {
			// setActiveTimezoneIdCookie(timezoneId.id);
			// setOrganizationIdCookie(timezoneId.organizationId);
			// This must be called at the end (Update store)
			setActiveTimezoneId(timezoneId.id);
		},
		[setActiveTimezoneId]
	);

	return {
		// loadTimezonesData,
		// loading,
		timezones,
		timezonesFetching,
		activeTimezone,
		setActiveTimezone,
		// createOrganizationTeam,
		// createOTeamLoading,
		// firstLoadTimezonesData,
	};
}