'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useOrganizationAndTeamManagers } from '@app/hooks/features/useOrganizationTeamManagers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from 'lib/features/team-member-header';
import { IssuesView } from '@app/constants';
import { HeaderTabs } from '@components/pages/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@app/stores/header-tabs';
import AllTeamsMembers from 'lib/features/all-teams-members';
import { MemberFilter } from 'lib/features/all-teams/all-team-members-filter';
import { useOrganizationTeams } from '@app/hooks';

function AllTeamsPage() {
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	const view = useAtomValue(allTeamsHeaderTabs);
	const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();
	const { isTrackingEnabled } = useOrganizationTeams();

	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.ALL_TEAMS'), href: '/all-teams' }
	];

	/* If the user is not a manager in any team or if he's
		manager in only one team, then redirect him to the home page
	*/
	if (userManagedTeams.length < 2) return <RedirectUser />;

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="items-start"
			mainHeaderSlot={
				<div className="flex w-full flex-col items-start  justify-between">
					<div className="w-full flex items-center justify-between py-2 px-4">
						<Breadcrumb paths={breadcrumb} className="text-sm" />
						<div className="flex self-end items-center gap-2">
							<div className="flex items-center justify-center h-10 gap-1 w-max">
								<HeaderTabs />
							</div>
							<MemberFilter />
						</div>
					</div>

					{view == IssuesView.CARDS && <TeamMemberHeader view={IssuesView.CARDS} />}
				</div>
			}
		>
			<Container fullWidth={fullWidth} className="mx-auto mt-5">
				<AllTeamsMembers teams={filteredTeams} view={view} />
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

export default withAuthentication(AllTeamsPage, {
	displayName: 'AllManagedTeams'
});
