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
import { useMemo, memo } from 'react';
import TeamMembersCardView from './team-members-views/team-members-card-view';
import TeamMembersTableView from './team-members-views/user-team-table/team-members-table-view';
import TeamMembersBlockView from './team-members-views/team-members-block-view';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TaskCardProps } from '@/core/types/interfaces/task/task-card';

// Types for better performance and security

interface TeamMembersProps {
	publicTeam?: boolean;
	kanbanView?: IssuesView;
}

interface TeamMembersViewProps {
	fullWidth?: boolean;
	members: TOrganizationTeamEmployee[];
	currentUser?: TOrganizationTeamEmployee;
	teamsFetching: boolean;
	view: IssuesView;
	blockViewMembers: TOrganizationTeamEmployee[];
	publicTeam: boolean;
	isMemberActive?: boolean;
}

// Constants to avoid re-creations
const EMPTY_ARRAY: TOrganizationTeamEmployee[] = [];
const TIMER_STATUS_PRIORITY = {
	[ETimerStatus.RUNNING]: 4,
	[ETimerStatus.ONLINE]: 3,
	[ETimerStatus.PAUSE]: 2,
	[ETimerStatus.IDLE]: 1,
	[ETimerStatus.SUSPENDED]: 0,
	undefined: 0
} as const;

// Utility functions optimized and cached
const sortByWorkStatus = (a: TOrganizationTeamEmployee, b: TOrganizationTeamEmployee): number => {
	const priorityA = TIMER_STATUS_PRIORITY[a.timerStatus as keyof typeof TIMER_STATUS_PRIORITY] ?? 0;
	const priorityB = TIMER_STATUS_PRIORITY[b.timerStatus as keyof typeof TIMER_STATUS_PRIORITY] ?? 0;
	return priorityB - priorityA;
};

const sortByOrder = (a: TOrganizationTeamEmployee, b: TOrganizationTeamEmployee): number => {
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
		const validMembers = rawMembers.filter(
			(member): member is TOrganizationTeamEmployee => member?.employee !== null
		);

		// Sorting with optimized function
		const sortedMembers = validMembers.sort(sortByWorkStatus);

		// Find the current user in the team members
		let currentUser = validMembers.find((m) => m.employee?.userId === user?.id);

		// IMPORTANT: If current user is not found in team members (new user case),
		// create a placeholder member object to ensure they always see their card
		if (!currentUser && user && activeTeam) {
			currentUser = {
				id: `temp-${user.id}`,
				employeeId: user.employee?.id || `temp-employee-${user.id}`,
				employee: {
					id: user.employee?.id || `temp-employee-${user.id}`,
					userId: user.id,
					user: user,
					organizationId: user.employee?.organizationId || activeTeam.organizationId,
					tenantId: user.employee?.tenantId || activeTeam.tenantId,
					isActive: true,
					isArchived: false
				},
				role: null,
				isTrackingEnabled: user.employee?.isTrackingEnabled || false,
				activeTaskId: null,
				organizationTeamId: activeTeam.id,
				assignedAt: new Date(),
				isManager: false,
				isOwner: false,
				order: 0,
				timerStatus: undefined
			} as TOrganizationTeamEmployee;
		}

		return {
			members: validMembers,
			orderedMembers: sortedMembers,
			currentUser
		};
	}, [activeTeam?.members, activeTeam?.id, activeTeam?.organizationId, activeTeam?.tenantId, user]);

	// Enhanced filtering for block view that includes current user in filter logic
	const blockViewMembers = useMemo(() => {
		// Create a complete list including current user for filtering
		const allMembers = [...processedMembers.orderedMembers];

		// Add current user to the list if they're not already included and exist
		if (processedMembers.currentUser && !allMembers.find((m) => m.id === processedMembers.currentUser?.id)) {
			allMembers.unshift(processedMembers.currentUser); // Add at the beginning
		}

		// Apply filter logic - handle ALL_MEMBERS case with other filters for consistent positioning
		let filteredMembers: TOrganizationTeamEmployee[];

		if (activeFilter === 'all') {
			// For ALL_MEMBERS, include all members without filtering
			filteredMembers = allMembers;
		} else {
			// Enhanced filter conditions for better new user support
			const filterCondition = (m: TOrganizationTeamEmployee) => {
				switch (activeFilter) {
					case 'idle':
						// Include users with no timer status (new users) or idle status
						return !m.timerStatus || m.timerStatus === ETimerStatus.IDLE;
					case 'online':
						// FIXED: Current user should ALWAYS appear in ONLINE filter when authenticated
						// regardless of their timer status (they're online by definition)
						return (
							m.timerStatus === ETimerStatus.ONLINE || m.employee?.user?.id === user?.id // Current user is always online
						);
					case 'running':
						return m.timerStatus === ETimerStatus.RUNNING;
					case 'pause':
						return m.timerStatus === ETimerStatus.PAUSE;
					default:
						return m.timerStatus === activeFilter;
				}
			};

			filteredMembers = allMembers.filter(filterCondition);
		}

		// FIXED: Ensure current user is always first in filtered results for ALL filters (including ALL_MEMBERS)
		if (processedMembers.currentUser && filteredMembers.length > 0) {
			const currentUserIndex = filteredMembers.findIndex((m) => m.id === processedMembers.currentUser?.id);
			if (currentUserIndex > 0) {
				// Move current user to first position
				const currentUserMember = filteredMembers.splice(currentUserIndex, 1)[0];
				filteredMembers.unshift(currentUserMember);
			}
		}

		return filteredMembers;
	}, [processedMembers.orderedMembers, processedMembers.currentUser, activeFilter, user?.id]);

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
		additionalProps: (): Partial<TaskCardProps> => ({})
	},
	[IssuesView.TABLE]: {
		component: TeamMembersTableView,
		containerProps: { className: '!overflow-x-auto !mx-0 px-1' },
		useTransition: true,
		useBlockMembers: false,
		additionalProps: (isMemberActive: boolean | undefined): Partial<TaskCardProps> => ({ active: isMemberActive })
	},
	[IssuesView.BLOCKS]: {
		component: TeamMembersBlockView,
		containerProps: { className: '!overflow-x-auto !mx-0 px-1' },
		useTransition: false,
		useBlockMembers: true,
		additionalProps: (): Partial<TaskCardProps> => ({})
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
		if (teamsFetching) {
			return (
				<Container fullWidth={fullWidth} className="!overflow-x-auto !mx-0 px-1">
					<div className="hidden lg:block">
						<UserTeamCardSkeletonCard />
						<UserTeamCardSkeletonCard />
						<UserTeamCardSkeletonCard />
						<UserTeamCardSkeletonCard />
						<InviteUserTeamCardSkeleton />
						<InviteUserTeamCardSkeleton />
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
			...(viewConfig.useBlockMembers ? {} : { currentUser }), // Only pass currentUser for non-block views
			publicTeam,
			teamsFetching,
			...(viewConfig.additionalProps?.(isMemberActive) || {})
		};

		// Creation of the component content
		const viewContent = <ViewComponent {...baseProps} />;

		// Rendering with or without transition according to the configuration
		const containerContent = viewConfig.useTransition ? (
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
