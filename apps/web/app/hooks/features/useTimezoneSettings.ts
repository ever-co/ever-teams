import {
    activeTimezoneState,
    timezoneListState,
    activeTimezoneIdState,
    timezonesFetchingState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import timeZones from '@components/pages/settings/timezones';

export function useTimezoneSettings() {
	const [timezones, setTimezone] = useRecoilState(timezoneListState);
	const activeTimezone = useRecoilValue(activeTimezoneState);
	const [activeTimezoneId, setActiveTimezoneId] = useRecoilState(activeTimezoneIdState);
	const [timezonesFetching, setTimezoneFetching] = useRecoilState(timezonesFetchingState);

	useEffect(() => {
        setTimezone(timeZones);
	}, [setTimezoneFetching, activeTimezone]);

	const setActiveTimezone = useCallback(
		(timezoneId: typeof timezones[0]) => {
			setActiveTimezoneId(timezoneId.id);
		},
		[setActiveTimezoneId]
	);

	return {
		timezones,
		timezonesFetching,
		activeTimezone,
		setActiveTimezone,
	};
}