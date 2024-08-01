"use client";

import { useAuthenticateUser } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTokenLiveKit } from '@app/hooks/useLiveKit';

const LiveKit = dynamic(() => import('lib/features/integrations/livekit'), {
    ssr: false,
    loading: () => <BackdropLoader show />
});

function LiveKitPage() {
    const router = useRouter();
    const { user } = useAuthenticateUser();
    const [roomName, setRoomName] = useState<string | undefined>(undefined);
    const params = useSearchParams();

    const onLeave = useCallback(() => {
        router.push('/');
    }, [router]);

    useEffect(() => {
        const room = params.get("roomName");
        if (room) {
            setRoomName(room);
        }
    }, [params]);

    const { token } = useTokenLiveKit({
        roomName: roomName || '',
        username: user?.email || '',
    });

    return (
        <>
            <Meta title="Meet" />
            {token && roomName && <LiveKit
                token={token!}
                roomName={roomName}
                liveKitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
                onLeave={onLeave}
                userChoices={{
                    videoEnabled: true,
                    audioEnabled: true,
                    audioDeviceId: '',
                    username: user?.email!,
                    videoDeviceId: ''
                }}
            />}
        </>
    );
}

export default withAuthentication(LiveKitPage, {
    displayName: 'LiveKitPage',
    showPageSkeleton: false
});
