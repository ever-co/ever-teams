import {
    activeTimezoneState,
    timezoneListState,
    activeTimezoneIdState,
    timezonesFetchingState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';

export function useTimezoneSettings() {
	const [timezones, setTimezone] = useRecoilState(timezoneListState);
	const activeTimezone = useRecoilValue(activeTimezoneState);
	const [, setActiveTimezoneId] = useRecoilState(activeTimezoneIdState);
	const [timezonesFetching, setTimezoneFetching] = useRecoilState(timezonesFetchingState);

	useEffect(() => {
        setTimezone(timezones);
	}, [setTimezoneFetching, activeTimezone, setTimezone, timezones]);

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
