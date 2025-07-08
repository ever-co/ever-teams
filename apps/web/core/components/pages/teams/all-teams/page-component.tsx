'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from '@/core/components/teams/team-member-header';
import { IssuesView } from '@/core/constants/config/constants';
import { HeaderTabs } from '@/core/components/pages/teams/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@/core/stores/common/header-tabs';
import { useOrganizationTeams } from '@/core/hooks/organizations';
import { MemberFilter } from './all-teams-members-views/all-team-members-filter';
import AllTeamsMembers from './all-teams-members-views/all-teams-members';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { TOrganizationTeam } from '@/core/types/schemas/team/team.schema';
import { AllTeamsPageSkeleton } from '@/core/components/layouts/skeletons/all-teams-page-skeleton';

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

	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (!filteredTeams || filteredTeams.length === 0) {
		return <AllTeamsPageSkeleton showTimer={isTrackingEnabled} fullWidth={fullWidth} />;
	}

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="items-start"
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="mx-auto">
					<div className="flex flex-col justify-between items-start w-full">
						<div className="flex justify-between items-center px-4 py-2 w-full">
							<Breadcrumb paths={breadcrumb} className="text-sm" />
							<div className="flex gap-2 items-center self-end">
								<div className="flex gap-1 justify-center items-center w-max h-10">
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
				<AllTeamsMembers teams={filteredTeams as unknown as TOrganizationTeam[]} view={view} />
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
