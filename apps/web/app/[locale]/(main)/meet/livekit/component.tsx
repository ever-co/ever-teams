'use client';

import { useAuthenticateUser } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { BackdropLoader, Meta } from '@/core/components';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTokenLiveKit } from '@/core/hooks/useLiveKit';

const LiveKit = dynamic(() => import('@/core/components/features/integrations/livekit'), {
	ssr: false,
	loading: () => <BackdropLoader show />
});

function LiveKitPage() {
	const router = useRouter();
	const { user } = useAuthenticateUser();
	const [roomName, setRoomName] = useState<string | undefined>(undefined);
	const params = useSearchParams();

	const onLeave = useCallback(() => {
		window.localStorage.removeItem('current-room-live-kit');
		router.push('/');
	}, [router]);

	useEffect(() => {
		const room = params.get('roomName');
		if (room) {
			setRoomName(room);
			window.localStorage.setItem('current-room-live-kit', room);
		}
	}, [params]);

	const { token } = useTokenLiveKit({
		roomName: roomName || '',
		username: user?.email || ''
	});

	return (
		<div>
			<Meta title="Meet" />
			{token && roomName && (
				<LiveKit
					token={token}
					roomName={roomName}
					liveKitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
					onLeave={onLeave}
					userChoices={{
						videoEnabled: true,
						audioEnabled: true,
						audioDeviceId: '',
						username: user?.email || '',
						videoDeviceId: ''
					}}
				/>
			)}
		</div>
	);
}

export default withAuthentication(LiveKitPage, {
	displayName: 'LiveKitPage',
	showPageSkeleton: false
});
