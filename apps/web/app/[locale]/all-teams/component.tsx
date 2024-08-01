'use client';

import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { MainHeader, MainLayout } from 'lib/layout';
import { useOrganizationAndTeamManagers } from '@app/hooks/features/useOrganizationTeamManagers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from 'lib/features/team-member-header';
import { IssuesView } from '@app/constants';
import { HeaderTabs } from '@components/pages/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@app/stores/header-tabs';
import AllTeamsMembers from 'lib/features/all-teams-members';
import { MemberFilter } from 'lib/features/all-teams/all-team-members-filter';

function AllTeamsPage() {
	const t = useTranslations();
	const fullWidth = useRecoilValue(fullWidthState);
	const view = useRecoilValue(allTeamsHeaderTabs);
	const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();

	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.ALL_TEAMS'), href: '/all-teams' }
	];

	/* If the user is not a manager in any team or if he's
		manager in only one team, then redirect him to the home page
	*/
	if (userManagedTeams.length < 2) return <RedirectUser />;

	return (
		<MainLayout className="items-start">
			<MainHeader fullWidth={fullWidth} className={'pb-2 pt-10 sticky top-20 z-50'}>
				{/* Breadcrumb */}
				<div className="flex flex-row items-start justify-between mb-5">
					<Breadcrumb paths={breadcrumb} className="text-sm" />
					<div className="flex flex-col gap-2 items-end">
						<div className="flex h-10 w-max items-center justify-center gap-1">
							<HeaderTabs />
						</div>
						<MemberFilter />
					</div>
				</div>
				<TeamMemberHeader view={IssuesView.CARDS} />
			</MainHeader>
			<Container fullWidth={fullWidth} className="flex py-10 pt-20">
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

export default withAuthentication(AllTeamsPage, { displayName: 'AllManagedTeams' });
