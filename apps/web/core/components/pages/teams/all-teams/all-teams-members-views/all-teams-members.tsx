import { useAtomValue } from 'jotai';
import { IssuesView } from '@/core/constants/config/constants';
import { fullWidthState } from '@/core/stores/common/full-width';
import { Container } from '@/core/components';
import UserTeamCardSkeletonCard from '@/core/components/teams/user-team-card-skeleton';
import InviteUserTeamCardSkeleton from '@/core/components/teams/invite-team-card-skeleton';
import { UserCard } from '@/core/components/teams/team-page-skeleton';
import TeamsMembersCardView from './all-teams-members-card-view';
import AllTeamsMembersBlockView from './all-teams-members-block-view';
import { TOrganizationTeam } from '@/core/types/schemas/team/team.schema';

export default function AllTeamsMembers({
	teams,
	view = IssuesView.CARDS
}: {
	teams: TOrganizationTeam[];
	view: IssuesView;
}) {
	const fullWidth = useAtomValue(fullWidthState);
	let teamsMembersView;

	switch (true) {
		case teams.length === 0:
			teamsMembersView = (
				<Container fullWidth={fullWidth}>
					<div className="hidden lg:block">
						<UserTeamCardSkeletonCard />
						<InviteUserTeamCardSkeleton />
					</div>
					<div className="block lg:hidden">
						<UserCard />
						<UserCard />
						<UserCard />
					</div>
				</Container>
			);
			break;
		case view === IssuesView.CARDS:
			teamsMembersView = <TeamsMembersCardView teams={teams} />;
			break;
		case view === IssuesView.BLOCKS:
			teamsMembersView = <AllTeamsMembersBlockView teams={teams} />;
			break;
		default:
			teamsMembersView = <TeamsMembersCardView teams={teams} />;
	}

	return teamsMembersView;
}
