import dynamic from 'next/dynamic';
import { JitsiMeetPageSkeleton, LiveKitMeetPageSkeleton } from '../pages/meet/meet-room-skeleton';

// Meet Components
export const LazyMeet = dynamic(() => import('@/core/components/integration/meet'), {
	ssr: false,
	loading: () => <JitsiMeetPageSkeleton />
});

export const LazyLiveKit = dynamic(() => import('@/core/components/integration/livekit'), {
	ssr: false,
	loading: () => <LiveKitMeetPageSkeleton />
});

// Starts the LiveKit chunk download before the room renders. It lives next to LazyLiveKit so both imports
// resolve to the same chunk. A failed preload is ignored: the render-time load reports the error.
export const preloadLiveKit = () => {
	import('@/core/components/integration/livekit').catch(() => undefined);
};
