import { useAtomValue } from 'jotai';
import { IssuesView } from '@app/constants';
import { IOrganizationTeamList } from '@app/interfaces';
import { fullWidthState } from '@app/stores/fullWidth';
import { Container } from 'lib/components';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from '@components/shared/skeleton/InviteTeamCardSkeleton';
import { UserCard } from '@components/shared/skeleton/TeamPageSkeleton';
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
