import { useOrganizationTeams } from '@/core/hooks';
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
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TaskCardProps } from '@/core/types/interfaces/task/task-card';
import { useProcessedTeamMembers, useFilteredTeamMembers } from '@/core/hooks/teams/use-processed-team-members';
import { TeamMemberFilterType } from '@/core/utils/team-members.utils';
import { userState } from '@/core/stores';

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

// Utility function for sorting by order (kept local as it's specific to this component)
const sortByOrder = (a: TOrganizationTeamEmployee, b: TOrganizationTeamEmployee): number => {
	if (a.order && b.order) return b.order - a.order;
	if (a.order) return -1;
	if (b.order) return 1;
	return 0;
};

// Main component optimized with refactored hooks
export const TeamMembers = memo<TeamMembersProps>(({ publicTeam = false, kanbanView: view = IssuesView.CARDS }) => {
	// Hooks
	const user = useAtomValue(userState);
	const activeFilter = useAtomValue(taskBlockFilterState) as TeamMemberFilterType;
	const fullWidth = useAtomValue(fullWidthState);
	const { activeTeam, getOrganizationTeamsLoading: teamsFetching } = useOrganizationTeams();

	// Use refactored hooks for member processing
	const processedMembers = useProcessedTeamMembers(activeTeam, user);
	const { filteredMembers: blockViewMembers } = useFilteredTeamMembers(processedMembers, activeFilter, user!);

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
