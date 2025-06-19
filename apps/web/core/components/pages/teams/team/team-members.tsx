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
import { useMemo, memo, Fragment } from 'react';
import TeamMembersCardView from './team-members-views/team-members-card-view';
import TeamMembersTableView from './team-members-views/user-team-table/team-members-table-view';
import TeamMembersBlockView from './team-members-views/team-members-block-view';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

// Types for better performance and security
interface TeamMember {
	id: string;
	employee?: {
		userId: string;
	} | null;
	timerStatus?: ETimerStatus;
	order?: number;
}

interface TeamMembersProps {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
}

interface TeamMembersViewProps {
	fullWidth?: boolean;
	members: TeamMember[];
	currentUser?: TeamMember;
	teamsFetching: boolean;
	view: IssuesView;
	blockViewMembers: TeamMember[];
	publicTeam: boolean;
	isMemberActive?: boolean;
}

// Constants to avoid re-creations
const EMPTY_ARRAY: TeamMember[] = [];
const TIMER_STATUS_PRIORITY = {
	[ETimerStatus.RUNNING]: 4,
	[ETimerStatus.ONLINE]: 3,
	[ETimerStatus.PAUSE]: 2,
	[ETimerStatus.IDLE]: 1,
	[ETimerStatus.SUSPENDED]: 0,
	undefined: 0
} as const;

// Utility functions optimized and cached
const sortByWorkStatus = (a: TeamMember, b: TeamMember): number => {
	const priorityA = TIMER_STATUS_PRIORITY[a.timerStatus as keyof typeof TIMER_STATUS_PRIORITY] ?? 0;
	const priorityB = TIMER_STATUS_PRIORITY[b.timerStatus as keyof typeof TIMER_STATUS_PRIORITY] ?? 0;
	return priorityB - priorityA;
};

const sortByOrder = (a: TeamMember, b: TeamMember): number => {
	if (a.order && b.order) return b.order - a.order;
	if (a.order) return -1;
	if (b.order) return 1;
	return 0;
};

// Main component optimized
export const TeamMembers = memo<TeamMembersProps>(({ publicTeam = false, kanbanView: view = IssuesView.CARDS }) => {
	// Hooks
	const { user } = useAuthenticateUser();
	const activeFilter = useAtomValue(taskBlockFilterState);
	const fullWidth = useAtomValue(fullWidthState);
	const { activeTeam, getOrganizationTeamsLoading: teamsFetching } = useOrganizationTeams();

	// Memoization of the main data with optimized dependencies
	const processedMembers = useMemo(() => {
		const rawMembers = activeTeam?.members || EMPTY_ARRAY;

		// Filtering and sorting in one pass to optimize performance
		const validMembers = rawMembers.filter((member): member is TeamMember => member?.employee !== null);

		// Sorting with optimized function
		const sortedMembers = validMembers.sort(sortByWorkStatus);

		// Find the current user in one pass
		const currentUser = validMembers.find((m) => m.employee?.userId === user?.id);

		return {
			members: validMembers,
			orderedMembers: sortedMembers,
			currentUser
		};
	}, [activeTeam?.members, user?.id]);

	// Filtering the members for the block view (optimized memoization)
	const blockViewMembers = useMemo(() => {
		if (activeFilter === 'all') return processedMembers.orderedMembers;

		const filterCondition =
			activeFilter === 'idle'
				? (m: TeamMember) => !m.timerStatus || m.timerStatus === ETimerStatus.IDLE
				: (m: TeamMember) => m.timerStatus === activeFilter;

		return processedMembers.orderedMembers.filter(filterCondition);
	}, [processedMembers.orderedMembers, activeFilter]);

	// Simple calculation without useless memoization
	const isTeamsFetching = teamsFetching && processedMembers.members.length === 0;

	return (
		<TeamMembersView
			teamsFetching={isTeamsFetching}
			members={processedMembers.members}
			currentUser={processedMembers.currentUser}
			fullWidth={fullWidth}
			publicTeam={publicTeam}
			view={view}
			blockViewMembers={blockViewMembers}
			isMemberActive={user?.isEmailVerified}
		/>
	);
});

// Configuration of the views - optimized table of correspondence
const VIEW_COMPONENTS_CONFIG = {
	[IssuesView.CARDS]: {
		component: TeamMembersCardView,
		containerProps: { className: '!overflow-x-auto !mx-0 px-0' },
		useTransition: false,
		useBlockMembers: false,
		additionalProps: () => ({}) as any
	},
	[IssuesView.TABLE]: {
		component: TeamMembersTableView,
		containerProps: { className: '!overflow-x-auto !mx-0 px-1' },
		useTransition: true,
		useBlockMembers: false,
		additionalProps: (isMemberActive: boolean | undefined) => ({ active: isMemberActive }) as any
	},
	[IssuesView.BLOCKS]: {
		component: TeamMembersBlockView,
		containerProps: { className: '!overflow-x-auto !mx-0 px-1' },
		useTransition: false,
		useBlockMembers: true,
		additionalProps: () => ({}) as any
	}
} as const;

// Optimized view component with table of correspondence
export const TeamMembersView = memo<TeamMembersViewProps>(
	({ fullWidth, members, currentUser, teamsFetching, view, blockViewMembers, publicTeam, isMemberActive }) => {
		// Filtering and sorting the other members (optimized)
		const otherMembers = useMemo(() => {
			return members.filter((member) => member.id !== currentUser?.id).sort(sortByOrder);
		}, [members, currentUser?.id]);

		// Early return for empty members
		if (members.length === 0) {
			return (
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
		}

		// Retrieving the configuration for the current view (with fallback on CARDS)
		const viewConfig =
			VIEW_COMPONENTS_CONFIG[view as keyof typeof VIEW_COMPONENTS_CONFIG] ||
			VIEW_COMPONENTS_CONFIG[IssuesView.CARDS];
		const ViewComponent = viewConfig.component;

		// Preparation of common props
		const baseProps = {
			teamMembers: viewConfig.useBlockMembers ? blockViewMembers : otherMembers,
			currentUser,
			publicTeam,
			teamsFetching,
			...(viewConfig.additionalProps?.(isMemberActive) || {})
		};

		// Creation of the component content
		const viewContent = <ViewComponent {...baseProps} />;

		// Rendering with or without transition according to the configuration
		const containerContent = viewConfig.useTransition ? (
			<Transition
				as={Fragment}
				show={!!currentUser}
				enter="transition-opacity duration-75"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-150"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				{viewContent}
			</Transition>
		) : (
			viewContent
		);

		return (
			<Container fullWidth={fullWidth} {...viewConfig.containerProps}>
				{containerContent}
			</Container>
		);
	}
);

TeamMembersView.displayName = 'TeamMembersView';
