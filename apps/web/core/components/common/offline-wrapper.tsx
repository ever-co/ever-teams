'use client';

import { useNetworkState } from '@uidotdev/usehooks';
import { PropsWithChildren } from 'react';
import dynamic from 'next/dynamic';
import Offline from '@/core/components/pages/offline';
import { useTimerView } from '@/core/hooks';
import { usePathname } from 'next/navigation';

/**
 * A wrapper component that conditionally renders the Offline component if the user is not online.
 * The Offline component is not shown on authentication pages (paths starting with /auth).
 * When the user is offline, the Offline component is rendered with the showTimer prop set to
 * whether the timer is running or not.
 *
 * @example
 * <OfflineWrapper>
 *   <MyComponent />
 * </OfflineWrapper>
 * @param {React.ReactNode} children - The children components to render when the user is online
 * @returns {React.ReactElement} - The Offline component if the user is offline (except on auth pages), or the children components if the user is online
 */
const OfflineWrapper = ({ children }: PropsWithChildren) => {
	// All hooks must be called before any conditional returns
	const { online } = useNetworkState();
	const { timerStatus } = useTimerView();
	const pathname = usePathname();

	// Compute conditions after all hooks are called
	const isAuthPage = pathname?.startsWith('/auth');
	const shouldShowOffline = !online && !isAuthPage;

	// Conditional rendering after all hooks
	if (shouldShowOffline) {
		return <Offline showTimer={timerStatus?.running} />;
	}

	return <>{children}</>;
};

export default dynamic(() => Promise.resolve(OfflineWrapper), {
	ssr: false
});
