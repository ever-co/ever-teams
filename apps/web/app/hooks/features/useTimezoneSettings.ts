'use client';

import { setActiveTimezoneCookie } from '@app/helpers';
import { activeTimezoneState, timezoneListState, activeTimezoneIdState, timezonesFetchingState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

export function useTimezoneSettings() {
	const [timezones] = useRecoilState(timezoneListState);
	const activeTimezone = useRecoilValue(activeTimezoneState);
	const [, setActiveTimezoneId] = useRecoilState(activeTimezoneIdState);
	const [timezonesFetching] = useRecoilState(timezonesFetchingState);

	// useEffect(() => {
	// 	setTimezone(timezones);
	// }, [setTimezone, timezones]);

	const setActiveTimezone = useCallback(
		(timezoneId: (typeof timezones)[0]) => {
			setActiveTimezoneId(timezoneId);
			setActiveTimezoneCookie(timezoneId);
		},
		[setActiveTimezoneId]
	);

	return {
		timezones,
		timezonesFetching,
		activeTimezone,
		setActiveTimezone
	};
}
