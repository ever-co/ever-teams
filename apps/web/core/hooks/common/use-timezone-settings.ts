'use client';

import { setActiveTimezoneCookie } from '@/core/lib/helpers/index';
import { activeTimezoneState, timezoneListState, activeTimezoneIdState, timezonesFetchingState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';

export function useTimezoneSettings() {
	const [timezones] = useAtom(timezoneListState);
	const activeTimezone = useAtomValue(activeTimezoneState);
	const [, setActiveTimezoneId] = useAtom(activeTimezoneIdState);
	const [timezonesFetching] = useAtom(timezonesFetchingState);

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
