"use client";
import { useAuthenticateUser, useCollaborative } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenLiveKit } from '@app/hooks/useLiveKit';

const LiveKit = dynamic(() => import('lib/features/integrations/livekit'), {
    ssr: false,
    loading: () => <BackdropLoader show />
});

function LiveKitPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { randomMeetName } = useCollaborative();
    const { user } = useAuthenticateUser();
    const [rootName, setRootName] = useState<string>(() => btoa(randomMeetName()));
    const replaced = useRef(false);

    const onLeave = useCallback(() => router.push('/'), [router]);

    const room = useMemo(() => {
        if (!pathname) return null;
        const urlParams = pathname.substring(pathname.indexOf('?'));
        const searchParams = new URLSearchParams(urlParams);
        return searchParams.get('roomName');
    }, [pathname]);

    useEffect(() => {
        if (!room && pathname?.startsWith('/livekit') && !replaced.current) {
            const url = new URL(window.location.href);
            const newRootName = btoa(randomMeetName());
            setRootName(newRootName);
            url.searchParams.set('roomName', newRootName);
            router.replace(url.pathname + url.search);
            replaced.current = true;
        }
    }, [room, pathname, randomMeetName, router]);

    const roomName = useMemo(() => {
        return room ? atob(room) : undefined;
    }, [room]);

    const { token } = useTokenLiveKit({
        roomName: rootName,
        username: user?.email || '',
    });

    return (
        <>
            <Meta title="Meet" />
            <LiveKit
                token={token || ''}
                roomName={encodeURIComponent(roomName || '')}
                liveKitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
                onLeave={onLeave}
                userChoices={{
                    videoEnabled: true,
                    audioEnabled: true,
                    audioDeviceId: '',
                    username: roomName || '',
                    videoDeviceId: ''
                }}
            />
        </>
    );
}

export default withAuthentication(LiveKitPage, {
    displayName: 'LiveKitPage',
    showPageSkeleton: false
});
