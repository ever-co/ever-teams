import dynamic from 'next/dynamic';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import { useOrganizationTeams, useQuery } from '@app/hooks';
import { getMeetJwtAuthTokenAPI } from '@app/services/client/api';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const Jitsi = dynamic(() => import('lib/features/integrations/meet'), {
	ssr: false,
	loading: () => <BackdropLoader show />,
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
	const { activeTeam } = useOrganizationTeams();
	const { token } = useMeetJwtToken();

	const room = router.query.room as string | undefined;

	const roomName = useMemo(() => {
		const name = room
			? atob(room)
			: activeTeam?.name
					.toLowerCase()
					.replace(/(?<= )[^\s]|^./g, (a) => a.toUpperCase())
					.replaceAll(' ', '');

		return name;
	}, [activeTeam?.name, room]);

	return (
		<>
			<Meta title="Meet" />
			{token && roomName && (
				<Jitsi jwt={token} roomName={encodeURIComponent(roomName)} />
			)}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false,
});
