'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/fullWidth';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from '@/core/components/teams/team-member-header';
import { IssuesView } from '@/core/constants/config/constants';
import { HeaderTabs } from '@/core/components/pages/teams/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@/core/stores/header-tabs';
import { useOrganizationTeams } from '@/core/hooks/organizations';
import { MemberFilter } from './all-teams-members-views/all-team-members-filter';
import AllTeamsMembers from './all-teams-members-views/all-teams-members';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

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
				<Container fullWidth={fullWidth} className="mx-auto">
					<div className="flex flex-col items-start justify-between w-full">
						<div className="flex items-center justify-between w-full px-4 py-2">
							<Breadcrumb paths={breadcrumb} className="text-sm" />
							<div className="flex items-center self-end gap-2">
								<div className="flex items-center justify-center h-10 gap-1 w-max">
									<HeaderTabs />
								</div>
								<MemberFilter />
							</div>
						</div>

						{view == IssuesView.CARDS && <TeamMemberHeader view={IssuesView.CARDS} />}
					</div>
				</Container>
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
