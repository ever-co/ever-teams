import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { Transition } from '@headlessui/react';
import UserTeamCardSkeletonCard from '@components/shared/skeleton/UserTeamCardSkeleton';
import InviteUserTeamCardSkeleton from '@components/shared/skeleton/InviteTeamCardSkeleton';
import { UserCard } from '@components/shared/skeleton/TeamPageSkeleton';
import TeamMembersTableView from './team-members-table-view';
import TeamMembersCardView from './team-members-card-view';
import { IssuesView } from '@app/constants';
import TeamMembersBlockView from './team-members-block-view';
import { useAtomValue } from 'jotai';
import { taskBlockFilterState } from '@app/stores/task-filter';
import { OT_Member } from '@app/interfaces';
import { Container } from 'lib/components';
import { fullWidthState } from '@app/stores/fullWidth';
import { useMemo } from 'react';

type TeamMembersProps = {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
};

export function TeamMembers({ publicTeam = false, kanbanView: view = IssuesView.CARDS }: Readonly<TeamMembersProps>) {
	const { user } = useAuthenticateUser();
	const activeFilter = useAtomValue(taskBlockFilterState);
	const fullWidth = useAtomValue(fullWidthState);
	const { activeTeam, getOrganizationTeamsLoading : teamsFetching } = useOrganizationTeams();

	const [members, orderedMembers] = useMemo(() => {
		const members = (activeTeam?.members || []).filter((member) => member.employee !== null);
		const orderedMembers = [...members].sort((a, b) => (sortByWorkStatus(a, b) ? -1 : 1));

		return [members, orderedMembers];
	}, [activeTeam]);

	const blockViewMembers = useMemo(() => {
		return activeFilter == 'all'
			? orderedMembers
			: activeFilter == 'idle'
				? orderedMembers.filter((m: OT_Member) => m.timerStatus == undefined || m.timerStatus == 'idle')
				: orderedMembers.filter((m) => m.timerStatus === activeFilter);
	}, [activeFilter, orderedMembers]);

	const currentUser = useMemo(() => members.find((m) => m.employee.userId === user?.id), [members, user?.id]);

	const $teamsFetching = teamsFetching && members.length === 0;

	return (
		<TeamMembersView
			teamsFetching={$teamsFetching}
			members={members}
			currentUser={currentUser}
			fullWidth={fullWidth}
			publicTeam={publicTeam}
			view={view}
			blockViewMembers={blockViewMembers}
			isMemberActive={user?.isEmailVerified}
		/>
	);
}

type TeamMembersViewProps = {
	fullWidth?: boolean;
	members: OT_Member[];
	currentUser?: OT_Member;
	teamsFetching: boolean;
	view: IssuesView;
	blockViewMembers: OT_Member[];
	publicTeam: boolean;
	isMemberActive?: boolean;
};

export function TeamMembersView({
	fullWidth,
	members,
	currentUser,
	teamsFetching,
	view,
	blockViewMembers,
	publicTeam,
	isMemberActive
}: TeamMembersViewProps) {
	let teamMembersView;

	const $members = useMemo(() => {
		return members
			.filter((member) => member.id !== currentUser?.id)
			.sort((a, b) => {
				if (a.order && b.order) return a.order > b.order ? -1 : 1;
				else return -1;
			});
	}, [members, currentUser]);

	switch (true) {
		case members.length === 0:
			teamMembersView = (
				<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
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
			teamMembersView = (
				<>
					{/* <UserTeamCardHeader /> */}
					<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
						<TeamMembersCardView
							teamMembers={$members}
							currentUser={currentUser}
							publicTeam={publicTeam}
							teamsFetching={teamsFetching}
						/>
					</Container>
				</>
			);
			break;
		case view === IssuesView.TABLE:
			teamMembersView = (
				<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
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
							active={isMemberActive}
						/>
					</Transition>
				</Container>
			);
			break;

		case view == IssuesView.BLOCKS:
			teamMembersView = (
				<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
					<TeamMembersBlockView
						teamMembers={blockViewMembers}
						currentUser={currentUser}
						publicTeam={publicTeam}
						teamsFetching={teamsFetching}
					/>
				</Container>
			);
			break;
		default:
			teamMembersView = (
				<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
					<TeamMembersCardView
						teamMembers={$members}
						currentUser={currentUser}
						publicTeam={publicTeam}
						teamsFetching={teamsFetching}
					/>
				</Container>
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
