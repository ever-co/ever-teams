import dynamic from 'next/dynamic';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import { useOrganizationTeams, useQuery } from '@app/hooks';
import { getJitsiJwtAuthTokenAPI } from '@app/services/client/api';
import { useEffect, useState } from 'react';

const Jitsi = dynamic(() => import('lib/features/integrations/jitsi'), {
	ssr: false,
	loading: () => <BackdropLoader show />,
});

function useJitsiJwtToken() {
	const [token, setToken] = useState<string>();
	const { queryCall, loading } = useQuery(getJitsiJwtAuthTokenAPI);

	useEffect(() => {
		queryCall().then((res) => setToken(res.data.token));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { loading, token };
}

function CallPage() {
	const { activeTeam } = useOrganizationTeams();
	const { token } = useJitsiJwtToken();

	const roomName = activeTeam?.name
		.toLowerCase()
		.replace(/(?<= )[^\s]|^./g, (a) => a.toUpperCase())
		.replaceAll(' ', '');

	return (
		<>
			<Meta title="Call" />
			{token && roomName && <Jitsi jwt={token} roomName={roomName} />}
		</>
	);
}

export default withAuthentication(CallPage, {
	displayName: 'CallPage',
	showPageSkeleton: false,
});
