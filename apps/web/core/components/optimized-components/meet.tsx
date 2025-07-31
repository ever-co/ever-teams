import dynamic from 'next/dynamic';

// Meet Components
export const LazyMeet = dynamic(() => import('@/core/components/integration/meet'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-96">
			<div className="text-gray-500">Loading Meet...</div>
		</div>
	)
});

export const LazyLiveKit = dynamic(() => import('@/core/components/integration/livekit'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-96">
			<div className="text-gray-500">Loading LiveKit...</div>
		</div>
	)
});
