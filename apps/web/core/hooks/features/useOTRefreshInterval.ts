'use client';

import { OTRefreshIntervalState } from '@app/stores';
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useCallbackRef } from '../useCallbackRef';

export function useOTRefreshInterval(
  callback: any,
  delay: number,
  publicTeam = true
) {
  const [interval, setOTRefreshIntervalState] = useAtom(OTRefreshIntervalState);

  // Remember the latest callback.
  const callbackRef = useCallbackRef(callback);

  // Set up the interval.
  useEffect(() => {
    // Do not refresh
    if (publicTeam) {
      return;
    }

    function tick() {
      callbackRef.current();
    }

    // If already set do not execute it again,
    // to avoid multiple setInterval calls, multiple API call.
    if (delay !== null && !interval) {
      const id = setInterval(tick, delay);
      setOTRefreshIntervalState(id as any);

      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, publicTeam]);
}
