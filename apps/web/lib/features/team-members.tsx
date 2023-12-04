import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { Transition } from '@headlessui/react';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from '@components/shared/skeleton/InviteTeamCardSkeleton';
import { UserCard } from '@components/shared/skeleton/TeamPageSkeleton';
import TeamMembersTableView from './team-members-table-view';
import TeamMembersCardView from './team-members-card-view';
import { IssuesView } from '@app/constants';
import TeamMembersBlockView from './team-members-block-view';
import { useRecoilValue } from 'recoil';
import { taskBlockFilterState } from '@app/stores/task-filter';

type TeamMembersProps = {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
};

export function TeamMembers({ publicTeam = false, kanbanView: view = IssuesView.CARDS }: TeamMembersProps) {
	const { user } = useAuthenticateUser();
	const activeFilter = useRecoilValue(taskBlockFilterState);
	const { activeTeam } = useOrganizationTeams();
	const { teamsFetching } = useOrganizationTeams();
	const members =
		activeFilter == 'all'
			? activeTeam?.members || []
			: activeTeam?.members.filter((m) => m.timerStatus == activeFilter) || [];
	const currentUser = members.find((m) => m.employee.userId === user?.id);
	const $members = members.filter((member) => member.id !== currentUser?.id);
	const $teamsFetching = teamsFetching && members.length === 0;

	let teamMembersView;

	switch (true) {
		case members.length === 0:
			teamMembersView = (
				<div className="">
					<div className="hidden lg:block">
						<UserTeamCardSkeletonCard />
						<InviteUserTeamCardSkeleton />
					</div>
					<div className="block lg:hidden">
						<UserCard />
						<UserCard />
						<UserCard />
					</div>
				</div>
			);
			break;
		case view === IssuesView.CARDS:
			teamMembersView = (
				<TeamMembersCardView
					teamMembers={$members}
					currentUser={currentUser}
					publicTeam={publicTeam}
					teamsFetching={$teamsFetching}
				/>
			);
			break;
		case view === IssuesView.TABLE:
			teamMembersView = (
				<Transition
					show={!!currentUser}
					enter="transition-opacity duration-75"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="transition-opacity duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<TeamMembersTableView
						teamMembers={$members}
						currentUser={currentUser}
						publicTeam={publicTeam}
						active={user?.isEmailVerified}
					/>
				</Transition>
			);
			break;

		case view == IssuesView.BLOCKS:
			teamMembersView = (
				<TeamMembersBlockView
					teamMembers={members}
					currentUser={currentUser}
					publicTeam={publicTeam}
					teamsFetching={$teamsFetching}
				/>
			);
			break;
		default:
			teamMembersView = (
				<TeamMembersCardView
					teamMembers={$members}
					currentUser={currentUser}
					publicTeam={publicTeam}
					teamsFetching={$teamsFetching}
				/>
			);
	}
	return teamMembersView;
}
