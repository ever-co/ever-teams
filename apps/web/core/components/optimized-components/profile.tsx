import dynamic from 'next/dynamic';
import {
	AppsTabSkeleton,
	ScreenshootTabSkeleton,
	VisitedSitesTabSkeleton
} from '../common/skeleton/profile-component-skeletons';

// Profile Activity Tab Components - Original (Legacy)
export const LazyAppsTab = dynamic(() => import('@/core/components/pages/profile/apps').then((mod) => mod.AppsTab), {
	ssr: false,
	loading: () => <AppsTabSkeleton />
});

export const LazyVisitedSitesTab = dynamic(
	() => import('@/core/components/pages/profile/visited-sites').then((mod) => mod.VisitedSitesTab),
	{
		ssr: false,
		loading: () => <VisitedSitesTabSkeleton />
	}
);

export const LazyScreenshootTab = dynamic(
	() => import('@/core/components/pages/profile/screenshots/screenshoots').then((mod) => mod.ScreenshootTab),
	{
		ssr: false,
		loading: () => <ScreenshootTabSkeleton />
	}
);

export const LazyScreenshootTeamTab = dynamic(
	() => import('@/core/components/pages/profile/screenshots/screenshoots').then((mod) => mod.ScreenshootTeamTab),
	{
		ssr: false,
		loading: () => <ScreenshootTabSkeleton />
	}
);

// Profile Activity Tab Components - Optimized (New)
export const LazyOptimizedAppsTab = dynamic(
	() =>
		import('@/core/components/activities/optimized-activity-tabs').then((mod) => ({
			default: mod.OptimizedAppsTab
		})),
	{
		ssr: false,
		loading: () => <AppsTabSkeleton />
	}
);

export const LazyOptimizedVisitedSitesTab = dynamic(
	() =>
		import('@/core/components/activities/optimized-activity-tabs').then((mod) => ({
			default: mod.OptimizedVisitedSitesTab
		})),
	{
		ssr: false,
		loading: () => <VisitedSitesTabSkeleton />
	}
);

export const LazyOptimizedScreenshotsTab = dynamic(
	() =>
		import('@/core/components/activities/optimized-activity-tabs').then((mod) => ({
			default: mod.OptimizedScreenshotsTab
		})),
	{
		ssr: false,
		loading: () => <ScreenshootTabSkeleton />
	}
);

export const LazyOptimizedTasksTab = dynamic(
	() =>
		import('@/core/components/activities/optimized-activity-tabs').then((mod) => ({
			default: mod.OptimizedTasksTab
		})),
	{
		ssr: false,
		loading: () => <div>Loading tasks...</div>
	}
);
