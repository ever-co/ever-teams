'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Breadcrumb, Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useOrganizationAndTeamManagers } from '@/core/hooks/features/useOrganizationTeamManagers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from '@/core/components/features/team-member-header';
import { IssuesView } from '@app/constants';
import { HeaderTabs } from '@/core/components/pages/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@app/stores/header-tabs';
import AllTeamsMembers from '@/core/components/features/all-teams-members';
import { MemberFilter } from '@/core/components/features/all-teams/all-team-members-filter';
import { useOrganizationTeams } from '@/core/hooks';

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
