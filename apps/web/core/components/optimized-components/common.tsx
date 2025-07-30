import dynamic from 'next/dynamic';
import { ActivityCalendarSkeleton } from '../common/skeleton/activity-calendar-skeleton';
import {
	UserProfileDetailSkeleton,
	TaskCardBlockSkeleton,
	UserTeamActivitySkeleton
} from '../common/skeleton/profile-component-skeletons';
import { AppSidebarSkeleton } from '../common/skeleton/app-sidebar-skeleton';

// Common Components
export const LazyActivityCalendar = dynamic(
	() => import('@/core/components/activities/activity-calendar').then((mod) => ({ default: mod.ActivityCalendar })),
	{
		ssr: false,
		loading: () => <ActivityCalendarSkeleton />
	}
);

export const LazyUserProfileDetail = dynamic(
	() =>
		import('@/core/components/pages/profile/user-profile-detail').then((mod) => ({
			default: mod.UserProfileDetail
		})),
	{
		ssr: false,
		loading: () => <UserProfileDetailSkeleton />
	}
);

export const LazyUserWorkedTaskTab = dynamic(
	() => import('@/core/components/activities/user-worked-task').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <TaskCardBlockSkeleton />
	}
);

export const LazyUserTeamActivity = dynamic(
	() => import('@/core/components/activities/user-team-card-activity').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <UserTeamActivitySkeleton />
	}
);

// Layout Components
export const LazyAppSidebar = dynamic(
	() => import('../layouts/app-sidebar').then((mod) => ({ default: mod.AppSidebar })),
	{
		loading: () => <AppSidebarSkeleton />,
		ssr: false // Client-only to avoid hydration issues with heavy hooks
	}
);

export const LazySidebarCommandModal = dynamic(
	() =>
		import('../layouts/default-layout/header/sidebar-command-modal').then((mod) => ({
			default: mod.SidebarCommandModal
		})),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

// Common Utility Components
export const LazyUnverifiedEmail = dynamic(
	() => import('@/core/components/common/unverified-email').then((mod) => ({ default: mod.UnverifiedEmail })),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Suspense fallback will handle all loading states uniformly
	}
);

export const LazyNoTeam = dynamic(() => import('@/core/components/common/no-team'), {
	ssr: false
	// Note: Removed loading here to avoid double loading states
	// Suspense fallback will handle all loading states uniformly
});

// Integration Components
export const LazyChatwootWidget = dynamic(() => import('@/core/components/integration/chatwoot'), {
	ssr: false
	// Note: No loading needed for chat widget - renders invisibly
});

// LazyMeet moved to meet.tsx to avoid conflicts

// LazyLiveKit moved to meet.tsx to avoid conflicts

// Board Components
export const LazyBoard = dynamic(() => import('@/core/components/integration/boards/exalidraw'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-96">
			<div className="text-gray-500">Loading Board...</div>
		</div>
	)
});

// Empty State Components
export const LazyAnimatedEmptyState = dynamic(
	() => import('@/core/components/common/empty-state').then((mod) => ({ default: mod.AnimatedEmptyState })),
	{
		ssr: false,
		loading: () => (
			<div className="grow w-full min-h-[600px] flex items-center justify-center flex-col">
				<div className="w-32 h-32 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full mb-4" />
				<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);
