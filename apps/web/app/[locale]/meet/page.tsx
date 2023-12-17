'use client';

import { useCollaborative, useQuery } from '@app/hooks';
import { getMeetJwtAuthTokenAPI } from '@app/services/client/api';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

const Meet = dynamic(() => import('lib/features/integrations/meet'), {
	ssr: false,
	loading: () => <BackdropLoader show />
});

function useMeetJwtToken() {
	const [token, setToken] = useState<string>();
	const { queryCall, loading } = useQuery(getMeetJwtAuthTokenAPI);

	useEffect(() => {
		queryCall().then((res) => setToken(res.data.token));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { loading, token };
}

function MeetPage() {
	const router = useRouter();
	const { token } = useMeetJwtToken();
	const { randomMeetName } = useCollaborative();
	const replaced = useRef(false);

	const room = useMemo(() => {
		const urlParams = router.asPath.substring(router.asPath.indexOf('?'));
		const searchParams = new URLSearchParams(urlParams);

		return searchParams.get('room');
	}, [router]);

	useEffect(() => {
		if (!room && router.asPath.startsWith('/meet') && !replaced.current) {
			const url = new URL(window.location.href);
			url.searchParams.set('room', btoa(randomMeetName()));

			router.replace(url.pathname + url.search);
			replaced.current = true;
		}
	}, [room, router, randomMeetName]);

	const roomName = useMemo(() => {
		return room ? atob(room) : undefined;
	}, [room]);

	return (
		<>
			<Meta title="Meet" />
			{token && roomName && <Meet jwt={token} roomName={encodeURIComponent(roomName)} />}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false
});
