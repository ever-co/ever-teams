import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { Transition } from '@headlessui/react';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from '@components/shared/skeleton/InviteTeamCardSkeleton';
import { UserCard } from '@components/shared/skeleton/TeamPageSkeleton';

import TeamMembersTableView from './team-members-table-view';
import TeamMembersCardView from './team-members-card-view';
import { IssuesView } from '@app/constants';

type TeamMembersProps = {
	publicTeam?: boolean;
	kabanView?: IssuesView;
};

export function TeamMembers({ publicTeam = false, kabanView = IssuesView.CARDS }: TeamMembersProps) {
	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();

	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee.userId === user?.id);
	const $members = members.filter((member) => member.id !== currentUser?.id);

	let teamMembersView;

	switch (true) {
		case members.length === 0:
			teamMembersView = (
				<div className="">
					<div className="lg:block hidden">
						<UserTeamCardSkeletonCard />
						<InviteUserTeamCardSkeleton />
					</div>
					<div className="block lg:hidden">
						<UserCard />
						<UserCard />
					</div>
				</div>
			);
			break;
		case kabanView === IssuesView.CARDS:
			teamMembersView = (
				<TeamMembersCardView teamMembers={members} currentUser={currentUser} publicTeam={publicTeam} />
			);
			break;
		case kabanView === IssuesView.TABLE:
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
		default:
			teamMembersView = (
				<TeamMembersCardView teamMembers={$members} currentUser={currentUser} publicTeam={publicTeam} />
			);
	}
	return teamMembersView;
}
