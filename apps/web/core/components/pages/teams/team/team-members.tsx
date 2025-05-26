import { useAuthenticateUser, useOrganizationTeams } from '@/core/hooks';
import { Transition } from '@headlessui/react';
import UserTeamCardSkeletonCard from '@/core/components/teams/user-team-card-skeleton';
import InviteUserTeamCardSkeleton from '@/core/components/teams/invite-team-card-skeleton';
import { UserCard } from '@/core/components/teams/team-page-skeleton';
import { IssuesView } from '@/core/constants/config/constants';
import { useAtomValue } from 'jotai';
import { taskBlockFilterState } from '@/core/stores/tasks/task-filter';
import { Container } from '@/core/components';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useMemo, useCallback } from 'react';
import TeamMembersCardView from './team-members-views/team-members-card-view';
import TeamMembersTableView from './team-members-views/user-team-table/team-members-table-view';
import TeamMembersBlockView from './team-members-views/team-members-block-view';
import { Member } from '../all-teams/all-teams-members-views/users-teams-block/member-block';
import { TimerStatusEnum } from '@/core/types/enums/timer';

type TeamMembersProps = {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
};

export function TeamMembers({ publicTeam = false, kanbanView: view = IssuesView.CARDS }: Readonly<TeamMembersProps>) {
	// Hooks with expensive computations
	const { user } = useAuthenticateUser();
	const activeFilter = useAtomValue(taskBlockFilterState);
	const fullWidth = useAtomValue(fullWidthState);
	const { activeTeam, getOrganizationTeamsLoading: teamsFetching } = useOrganizationTeams();

	// Memoize the filter function to prevent recreation on every render
	const filterValidMembers = useCallback((members: Member[]) => {
		return members.filter((member) => member.employee !== null);
	}, []);

	// Memoize the sort function
	const sortMembers = useCallback((members: Member[]) => {
		return [...members].sort((a, b) => (sortByWorkStatus(a, b) ? -1 : 1));
	}, []);

	// Combine filter and sort in one memoized computation
	const [members, orderedMembers] = useMemo(() => {
		const validMembers = filterValidMembers(activeTeam?.members || []);
		const sortedMembers = sortMembers(validMembers);
		return [validMembers, sortedMembers];
	}, [activeTeam?.members, filterValidMembers, sortMembers]);

	// Memoize the block view filter function
	const filterBlockViewMembers = useCallback((members: Member[], filter: string) => {
		if (filter === 'all') return members;
		if (filter === 'idle') {
			return members.filter((m) => m.timerStatus === undefined || m.timerStatus === 'idle');
		}
		return members.filter((m) => m.timerStatus === filter);
	}, []);

	// Memoize block view members with proper dependencies
	const blockViewMembers = useMemo(
		() => filterBlockViewMembers(orderedMembers, activeFilter),
		[orderedMembers, activeFilter, filterBlockViewMembers]
	);

	// Memoize current user lookup with proper dependencies
	const currentUser = useMemo(() => members.find((m) => m.employee?.userId === user?.id), [members, user?.id]);

	// Simple computation, no need for useMemo
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
	members: Member[];
	currentUser?: Member;
	teamsFetching: boolean;
	view: IssuesView;
	blockViewMembers: Member[];
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

	// Memoize the filter function to prevent recreation on every render
	const filterOtherMembers = useCallback((members: Member[], currentUser: Member | undefined) => {
		return members.filter((member) => member.id !== currentUser?.id);
	}, []);

	// Memoize the sort function
	const sortOtherMembers = useCallback((members: Member[]) => {
		return members.sort((a, b) => {
			if (a.order && b.order) return a.order > b.order ? -1 : 1;
			if (a.order) return -1;
			if (b.order) return 1;
			return -1;
		});
	}, []);

	// Combine filter and sort in one memoized computation
	const $members = useMemo(() => {
		const otherMembers = filterOtherMembers(members, currentUser);
		const sortedMembers = sortOtherMembers(otherMembers);
		return sortedMembers;
	}, [members, currentUser, filterOtherMembers, sortOtherMembers]);

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
					<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-0">
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
						as="div"
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

		case view === IssuesView.BLOCKS:
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

const sortByWorkStatus = (user_a: Member, user_b: Member) => {
	return (
		user_a.timerStatus === TimerStatusEnum.RUNNING ||
		(user_a.timerStatus === TimerStatusEnum.ONLINE && user_b.timerStatus !== TimerStatusEnum.RUNNING) ||
		(user_a.timerStatus === TimerStatusEnum.PAUSE &&
			user_b.timerStatus !== TimerStatusEnum.RUNNING &&
			user_b.timerStatus !== TimerStatusEnum.ONLINE) ||
		(user_a.timerStatus === TimerStatusEnum.IDLE && user_b.timerStatus === TimerStatusEnum.SUSPENDED) ||
		(user_a.timerStatus === undefined && user_b.timerStatus === TimerStatusEnum.SUSPENDED)
	);
};
