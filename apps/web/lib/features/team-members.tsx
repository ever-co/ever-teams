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
import { OT_Member } from '@app/interfaces';

type TeamMembersProps = {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
};
{/* <div className={`z-50 bg-white dark:bg-[#191A20] pt-5 ${view == IssuesView.TABLE ? 'pb-7' : ''}`}>
<Container fullWidth={fullWidth}>
	{isTeamMember ? <TaskTimerSection isTrackingEnabled={isTrackingEnabled} /> : null}
	{view === IssuesView.CARDS && isTeamMember ? (
		<UserTeamCardHeader />
	) : view === IssuesView.BLOCKS ? (
		<UserTeamBlockHeader />
	) : view === IssuesView.TABLE ? (
		<UserTeamTableHeader />
	) : null}
</Container>


<div className="h-0.5 bg-[#FFFFFF14]"></div>
</div> */}
export function TeamMembers({ publicTeam = false, kanbanView: view = IssuesView.CARDS }: TeamMembersProps) {
	const { user } = useAuthenticateUser();
	const activeFilter = useRecoilValue(taskBlockFilterState);
	const { activeTeam } = useOrganizationTeams();
	const { teamsFetching } = useOrganizationTeams();
	const members = activeTeam?.members || [];
	const orderedMembers = [...members].sort((a, b) => (sortByWorkStatus(a, b) ? -1 : 1));

	const blockViewMembers =
		activeFilter == 'all'
			? orderedMembers
			: activeFilter == 'idle'
			? orderedMembers.filter((m: OT_Member) => m.timerStatus == undefined || m.timerStatus == 'idle')
			: orderedMembers.filter((m) => m.timerStatus === activeFilter);

	const currentUser = members.find((m) => m.employee.userId === user?.id);
	const $members = members
		.filter((member) => member.id !== currentUser?.id)
		.sort((a, b) => {
			if (a.order && b.order) return a.order > b.order ? -1 : 1;
			else return -1;
		});
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
					teamMembers={blockViewMembers}
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

const sortByWorkStatus = (user_a: OT_Member, user_b: OT_Member) => {
	return user_a.timerStatus == 'running' ||
		(user_a.timerStatus == 'online' && user_b.timerStatus != 'running') ||
		(user_a.timerStatus == 'pause' && user_b.timerStatus !== 'running' && user_b.timerStatus !== 'online') ||
		(user_a.timerStatus == 'idle' && user_b.timerStatus == 'suspended') ||
		(user_a.timerStatus === undefined && user_b.timerStatus == 'suspended')
		? true
		: false;
};
