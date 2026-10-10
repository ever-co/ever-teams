'use client';

import { useNetworkState } from '@uidotdev/usehooks';
import { PropsWithChildren, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Offline, { preloadOfflineTimer } from '@/core/components/pages/offline';
import { useTimerView } from '@/core/hooks/activities/use-timer';

/**
 * A wrapper component that conditionally renders the Offline component if the user is not online.
 * It is mounted by the (main) layout only, so authentication pages never show the Offline component.
 * When the user is offline, the Offline component is rendered with the showTimer prop set to
 * whether the timer is running or not.
 *
 * @example
 * <OfflineWrapper>
 *   <MyComponent />
 * </OfflineWrapper>
 * @param {React.ReactNode} children - The children components to render when the user is online
 * @returns {React.ReactElement} - The Offline component if the user is offline, or the children components if the user is online
 */
const OfflineWrapper = ({ children }: PropsWithChildren) => {
	// All hooks must be called before any conditional returns
	const { online } = useNetworkState();
	const { timerStatus } = useTimerView();
	const timerRunning = !!timerStatus?.running;

	useEffect(() => {
		if (online && timerRunning) {
			preloadOfflineTimer().catch(() => undefined);
		}
	}, [online, timerRunning]);

	// Conditional rendering after all hooks
	if (online === false) {
		return <Offline showTimer={timerStatus?.running} />;
	}

	return <>{children}</>;
};

export default dynamic(() => Promise.resolve(OfflineWrapper), {
	ssr: false
});
