import dynamic from 'next/dynamic';
// import { TeamsDropDownSkeleton } from '../common/skeleton/teams-dropdown-skeleton';
// import { ModalSkeleton } from '../common/skeleton/modal-skeleton';

// Team Components
export const LazyTeamOutstandingNotifications = dynamic(
	() =>
		import('@/core/components/teams/team-outstanding-notifications').then((mod) => ({
			default: mod.TeamOutstandingNotifications
		})),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

export const LazyTeamMembers = dynamic(
	() => import('@/core/components/pages/teams/team/team-members').then((mod) => ({ default: mod.TeamMembers })),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

export const LazyTeamInvitations = dynamic(
	() => import('@/core/components/teams/team-invitations').then((mod) => ({ default: mod.TeamInvitations })),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

// Team Header Components
export const LazyUserTeamCardHeader = dynamic(
	() =>
		import('../pages/teams/team/team-members-views/team-members-header').then((mod) => ({
			default: mod.UserTeamCardHeader
		})),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);

export const LazyUserTeamTableHeader = dynamic(
	() => import('../pages/teams/team/team-members-views/user-team-table/user-team-table-header'),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);

export const LazyUserTeamBlockHeader = dynamic(
	() =>
		import('../pages/teams/team/team-members-views/user-team-block/user-team-block-header').then((mod) => ({
			default: mod.UserTeamBlockHeader
		})),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);

// Team Modals - LazyCreateTeamModal defined below to avoid duplication

export const LazyJoinTeamModal = dynamic(
	() => import('@/core/components/features/teams/join-team-modal').then((mod) => ({ default: mod.JoinTeamModal })),
	{
		ssr: false
	}
);

// Team Member Header (Main Component)
export const LazyTeamMemberHeader = dynamic(() => import('@/core/components/teams/team-member-header'), {
	ssr: false
	// Note: Removed loading here to avoid double loading states
	// Suspense fallback will handle all loading states uniformly
});

// Teams Dropdown Components
export const LazyTeamsDropDown = dynamic(
	() => import('@/core/components/teams/teams-dropdown').then((mod) => ({ default: mod.TeamsDropDown })),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

// Team Request Modals
export const LazyRequestToJoinModal = dynamic(
	() =>
		import('@/core/components/features/teams/request-to-join-modal').then((mod) => ({
			default: mod.RequestToJoinModal
		})),
	{
		ssr: false
	}
);

// Create Team Modal
export const LazyCreateTeamModal = dynamic(
	() =>
		import('@/core/components/features/teams/create-team-modal').then((mod) => ({ default: mod.CreateTeamModal })),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);
