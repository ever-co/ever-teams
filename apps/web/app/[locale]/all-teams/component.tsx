'use client';

import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from 'lib/app/authenticator';
import { Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useOrganizationAndTeamManagers } from '@app/hooks/features/useOrganizationTeamManagers';
import { useEffect } from 'react';

function AllTeamsPage() {
	const fullWidth = useRecoilValue(fullWidthState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();

	/* If the user is not a manager in any team or if he's
        manager in only one team, then redirect him to the home page
    */
	if (userManagedTeams.length < 2) return <RedirectUser />;

	return (
		<MainLayout className="items-start">
			<Container fullWidth={fullWidth} className="flex">
				<div>All teams</div>
			</Container>
		</MainLayout>
	);
}

function RedirectUser() {
	const router = useRouter();
	useEffect(() => {
		router.push('/');
	}, [router]);
	return <></>;
}

export default withAuthentication(AllTeamsPage, { displayName: 'AllManagedTeams' });
