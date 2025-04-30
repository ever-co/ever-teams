'use client';

import { setActiveTimezoneCookie } from '@app/helpers';
import {
  activeTimezoneState,
  timezoneListState,
  activeTimezoneIdState,
  timezonesFetchingState
} from '@app/stores';
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
    (timezoneId: typeof timezones[0]) => {
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
