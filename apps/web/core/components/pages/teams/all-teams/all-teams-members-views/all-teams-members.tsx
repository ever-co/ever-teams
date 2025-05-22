import { useAtomValue } from 'jotai';
import { IssuesView } from '@/core/constants/config/constants';
<<<<<<< HEAD
import { IOrganizationTeamList } from '@/core/types/interfaces';
import { fullWidthState } from '@/core/stores/common/full-width';
=======
import { IOrganizationTeamList } from '@/core/types/interfaces/to-review';
import { fullWidthState } from '@/core/stores/fullWidth';
>>>>>>> d2027d8b9 (refactor tasks and related types/interfaces)
import { Container } from '@/core/components';
import UserTeamCardSkeletonCard from '@/core/components/teams/user-team-card-skeleton';
import InviteUserTeamCardSkeleton from '@/core/components/teams/invite-team-card-skeleton';
import { UserCard } from '@/core/components/teams/team-page-skeleton';
import TeamsMembersCardView from './all-teams-members-card-view';
import AllTeamsMembersBlockView from './all-teams-members-block-view';

export default function AllTeamsMembers({
	teams,
	view = IssuesView.CARDS
}: {
	teams: IOrganizationTeamList[];
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
