import { ActivityCalendarSkeleton } from './common/skeleton/activity-calendar-skeleton';
import {
	AppsTabSkeleton,
	ScreenshootTabSkeleton,
	TaskCardSkeleton,
	TaskFilterSkeleton,
	UserProfileDetailSkeleton,
	UserProfileTaskSkeleton,
	VisitedSitesTabSkeleton
} from './common/skeleton/profile-component-skeletons';
import dynamic from 'next/dynamic';

export const LazyTaskCard = dynamic(
	() => import('@/core/components/tasks/task-card').then((mod) => ({ default: mod.TaskCard })),
	{
		ssr: false,
		loading: () => <TaskCardSkeleton />
	}
);
export const LazyActivityCalendar = dynamic(
	() => import('@/core/components/activities/activity-calendar').then((mod) => ({ default: mod.ActivityCalendar })),
	{
		ssr: false,
		loading: () => <ActivityCalendarSkeleton />
	}
);

// All heavy components lazy loaded with pixel-perfect skeletons
// Priority 1: Profile components
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

// Priority 2: Task components (CRITICAL - heaviest components)
export const LazyUserProfileTask = dynamic(
	() =>
		import('@/core/components/pages/profile/user-profile-tasks').then((mod) => ({
			default: mod.UserProfileTask
		})),
	{
		ssr: false,
		loading: () => <UserProfileTaskSkeleton />
	}
);

export const LazyTaskFilter = dynamic(
	() => import('@/core/components/pages/profile/task-filters').then((mod) => ({ default: mod.TaskFilter })),
	{
		ssr: false,
		loading: () => <TaskFilterSkeleton />
	}
);

// Priority 3: Activity tab components
export const LazyAppsTab = dynamic(
	() => import('@/core/components/pages/profile/apps').then((mod) => ({ default: mod.AppsTab })),
	{
		ssr: false,
		loading: () => <AppsTabSkeleton />
	}
);

export const LazyVisitedSitesTab = dynamic(
	() => import('@/core/components/pages/profile/visited-sites').then((mod) => ({ default: mod.VisitedSitesTab })),
	{
		ssr: false,
		loading: () => <VisitedSitesTabSkeleton />
	}
);

export const LazyScreenshootTab = dynamic(
	() =>
		import('@/core/components/pages/profile/screenshots/screenshoots').then((mod) => ({
			default: mod.ScreenshootTab
		})),
	{
		ssr: false,
		loading: () => <ScreenshootTabSkeleton />
	}
);
export const LazyTimer = dynamic(
	() => import('@/core/components/timer/timer').then((mod) => ({ default: mod.Timer })),
	{
		ssr: false
	}
);

export const LazyJoinTeamModal = dynamic(
	() => import('@/core/components/features/teams/join-team-modal').then((mod) => ({ default: mod.JoinTeamModal })),
	{
		ssr: false
	}
);

export const LazyCreateTeamModal = dynamic(
	() =>
		import('@/core/components/features/teams/create-team-modal').then((mod) => ({ default: mod.CreateTeamModal })),
	{
		ssr: false
	}
);

export const LazyAddManualTimeModal = dynamic(
	() =>
		import('@/core/components/features/manual-time/add-manual-time-modal').then((mod) => ({
			default: mod.AddManualTimeModal
		})),
	{
		ssr: false
	}
);
