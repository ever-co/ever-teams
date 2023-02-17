import { useOrganizationTeams } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Team = () => {
	const router = useRouter();
	const query = router.query;
	const { teams, setActiveTeam } = useOrganizationTeams();

	useEffect(() => {
		if (query && query?.teamId) {
			const currentTeam = teams.find(
				(team) => team.id === query.teamId || team.profile_link === query.teamId
			);
			if (currentTeam) {
				setActiveTeam(currentTeam);
			}
			router.push('/');
		}
	}, [query, router, setActiveTeam, teams]);

	return <></>;
};

export default withAuthentication(Team, { displayName: 'TeamPage' });
