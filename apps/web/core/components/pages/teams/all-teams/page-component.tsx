'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useOrganizationAndTeamManagers } from '@/core/hooks/organizations/teams/use-organization-teams-managers';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from '@/core/components/teams/team-member-header';
import { IssuesView } from '@/core/constants/config/constants';
import { HeaderTabs } from '@/core/components/pages/teams/all-teams/header-tabs';
import { allTeamsHeaderTabs } from '@/core/stores/common/header-tabs';
import { MemberFilter } from './all-teams-members-views/all-team-members-filter';
import AllTeamsMembers from './all-teams-members-views/all-teams-members';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { AllTeamsPageSkeleton } from './all-teams-page-skeleton';
import { isTeamMemberState, isTrackingEnabledState, organizationTeamsState } from '@/core/stores';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import { Users } from '@/core/components/icons';

function AllTeamsPage() {
	const t = useTranslations();
	const view = useAtomValue(allTeamsHeaderTabs);
	const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();
	const teams = useAtomValue(organizationTeamsState);
	const isTeamMember = useAtomValue(isTeamMemberState);

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	const allTeamsTitle = t('common.ALL_TEAMS');
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: allTeamsTitle, href: '/all-teams' }
	];
	const isCardsView = view == IssuesView.CARDS;
	const hasTeams = teams.length > 0;
	const hasNoTeam = !isTeamMember;
	const areTeamsKnown = hasTeams || hasNoTeam;

	// The managed teams can only be counted once the team list has arrived
	if (!areTeamsKnown) {
		return <AllTeamsPageSkeleton />;
	}

	/* If the user is not a manager in any team or if he's
		manager in only one team, then redirect him to the home page
	*/
	if (userManagedTeams.length < 2) return <RedirectUser />;

	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (!filteredTeams || filteredTeams.length === 0) {
		return <AllTeamsPageSkeleton />;
	}

	return (
		<PageLayout
			showTimer={isTrackingEnabled}
			className="items-start"
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumb} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<div>
					<div className="px-4">
						<div className="flex flex-wrap items-center justify-between gap-3 py-3">
							<h1 className="text-lg font-semibold">{allTeamsTitle}</h1>
							<div className="flex items-center gap-2">
								<HeaderTabs />
								<MemberFilter />
							</div>
						</div>
					</div>

					{isCardsView && <TeamMemberHeader view={IssuesView.CARDS} />}
				</div>
			}
		>
			<AllTeamsMembers teams={filteredTeams as unknown as TOrganizationTeam[]} view={view} />
		</PageLayout>
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
	displayName: 'AllManagedTeams',
	skeleton: AllTeamsPageSkeleton
});
