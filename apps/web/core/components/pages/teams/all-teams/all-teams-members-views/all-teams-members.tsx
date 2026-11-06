import { IssuesView } from '@/core/constants/config/constants';
import { Container } from '@/core/components';
import UserTeamCardSkeletonCard from '@/core/components/teams/user-team-card-skeleton';
import InviteUserTeamCardSkeleton from '@/core/components/teams/invite-team-card-skeleton';
import { UserCard } from '@/core/components/teams/team-page-skeleton';
import TeamsMembersCardView from './all-teams-members-card-view';
import AllTeamsMembersBlockView from './all-teams-members-block-view';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';

const SURFACE =
	'hairline-divide-y divide-border rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';
const SKELETON_ROW = 'rounded-none bg-transparent shadow-none ring-0';

export default function AllTeamsMembers({
	teams,
	view = IssuesView.CARDS
}: {
	teams: TOrganizationTeam[];
	view: IssuesView;
}) {
	let teamsMembersView;

	switch (true) {
		case teams.length === 0:
			teamsMembersView = (
				<Container>
					<div className={`hidden lg:block ${SURFACE}`}>
						<UserTeamCardSkeletonCard className={SKELETON_ROW} />
						<InviteUserTeamCardSkeleton className={SKELETON_ROW} />
					</div>
					<div className={`block lg:hidden ${SURFACE}`}>
						<UserCard className={`${SKELETON_ROW} my-0 px-3`} />
						<UserCard className={`${SKELETON_ROW} my-0 px-3`} />
						<UserCard className={`${SKELETON_ROW} my-0 px-3`} />
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
