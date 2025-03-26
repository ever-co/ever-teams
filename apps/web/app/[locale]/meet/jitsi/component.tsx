'use client';

import { useCollaborative, useQuery } from '@app/hooks';
import { getMeetJwtAuthTokenAPI } from '@app/services/client/api';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

// Lazy load Meet component
const Meet = dynamic(() => import('lib/features/integrations/meet'), {
    ssr: false,
    loading: () => <BackdropLoader show />
});

function useMeetJwtToken() {
    const [token, setToken] = useState<string>();
    const [error, setError] = useState<Error>();
    const { queryCall, loading } = useQuery(getMeetJwtAuthTokenAPI);

    useEffect(() => {
        const getToken = async () => {
            try {
                const res = await queryCall();
                setToken(res.data.token);
            } catch (err) {
                setError(err as Error);
            }
        };

        getToken();
    }, [queryCall]); // Added queryCall to dependencies

    return { loading, token, error };
}

function MeetPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { token, error } = useMeetJwtToken();
    const { randomMeetName } = useCollaborative();
    const replaced = useRef(false);

    // Extract room name from URL with proper validation
    const room = useMemo(() => {
        if (!pathname) return null;

        const queryIndex = pathname.indexOf('?');
        if (queryIndex === -1) return null;

        const urlParams = pathname.substring(queryIndex);
        const searchParams = new URLSearchParams(urlParams);
        const roomParam = searchParams.get('room');

        return roomParam && /^[A-Za-z0-9+/=]+$/.test(roomParam) ? roomParam : null;
    }, [pathname]);

    // Handle room creation and navigation
    useEffect(() => {
        if (!room && pathname?.startsWith('/meet/jitsi') && !replaced.current) {
            try {
                const url = new URL(window.location.href);
                const newRoom = btoa(randomMeetName());
                url.searchParams.set('room', newRoom);
                router.replace(url.pathname + url.search);
                replaced.current = true;
            } catch (err) {
                console.error('Failed to create room:', err);
            }
        }
    }, [room, router, randomMeetName, pathname]);

    // Decode room name with validation
    const roomName = useMemo(() => {
        if (!room) return null;
        try {
            return atob(room);
        } catch {
            return null;
        }
    }, [room]);

    // Show error state if token fetch failed
    if (error) {
        return <div>Failed to initialize meeting: {error.message}</div>;
    }

    return (
        <>
            <Meta title="Meet" />
            {token && roomName && (
                <Meet 
                    jwt={token} 
                    roomName={encodeURIComponent(roomName)}
                />
            )}
        </>
    );
}

export default withAuthentication(MeetPage, {
    displayName: 'MeetPage',
    showPageSkeleton: false
});
