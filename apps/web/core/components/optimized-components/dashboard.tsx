import dynamic from 'next/dynamic';
import { DashboardHeaderSkeleton } from '../common/skeleton/dashboard-header-skeleton';
import { ChartSkeleton } from '../common/skeleton/chart-skeleton';
import { TeamStatsGridSkeleton } from '../common/skeleton/team-stats-grid-skeleton';

import { AuthUserTaskInputSkeleton } from '@/core/components/common/skeleton/auth-user-task-input-skeleton';
// Dashboard Header Components
export const LazyDashboardHeader = dynamic(
	() =>
		import('@/core/components/pages/dashboard/dashboard-header').then((mod) => ({
			default: mod.DashboardHeader
		})),
	{
		ssr: false,
		loading: () => <DashboardHeaderSkeleton />
	}
);

export const LazyDateRangePicker = dynamic(
	() => import('@/core/components/common/date-range-picker').then((mod) => mod.DateRangePicker),
	{
		ssr: false,
		loading: () => <div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

export const LazyTeamDashboardFilter = dynamic(
	() => import('@/core/components/pages/dashboard/team-dashboard-filter').then((mod) => mod.TeamDashboardFilter),
	{
		ssr: false,
		loading: () => <div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

export const LazyExportDialog = dynamic(
	() => import('@/core/components/pages/dashboard/export-dialog').then((mod) => mod.ExportDialog),
	{
		ssr: false
		// Note: No loading property for conditional components
	}
);

// Productivity Components
export const LazyProductivityChart = dynamic(
	() => import('@/core/components/pages/dashboard/app-url/productivity-chart').then((mod) => mod.ProductivityChart),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-64 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Chart...</div>
			</div>
		)
	}
);

export const LazyProductivityHeader = dynamic(
	() => import('@/core/components/pages/dashboard/app-url').then((mod) => mod.ProductivityHeader),
	{
		ssr: false,
		loading: () => (
			<div className="flex flex-col gap-2">
				<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

export const LazyProductivityStats = dynamic(
	() => import('@/core/components/pages/dashboard/app-url').then((mod) => mod.ProductivityStats),
	{
		ssr: false,
		loading: () => (
			<div className="flex gap-6">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className="flex flex-col gap-2 items-center">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>
		)
	}
);

// Team Dashboard Components
export const LazyTeamStatsChart = dynamic(
	() =>
		import('@/core/components/pages/dashboard/team-dashboard/team-stats-chart').then((mod) => ({
			default: mod.TeamStatsChart
		})),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
);

export const LazyTeamStatsTable = dynamic(
	() =>
		import('@/core/components/pages/dashboard/team-dashboard/team-stats-table').then((mod) => ({
			default: mod.TeamStatsTable
		})),
	{
		ssr: false
		// Note: Loading handled by parent Suspense
	}
);

export const LazyTeamStatsGrid = dynamic(
	() =>
		import('@/core/components/pages/dashboard/team-dashboard').then((mod) => ({
			default: mod.TeamStatsGrid
		})),
	{
		ssr: false,
		loading: () => <TeamStatsGridSkeleton />
	}
);

// Task Timer Section
export const LazyTimer = dynamic(
	() => import('@/core/components/timer/timer').then((mod) => ({ default: mod.Timer })),
	{
		ssr: false
	}
);

export const LazyMinTimerFrame = dynamic(
	() => import('../timer/timer').then((mod) => ({ default: mod.MinTimerFrame })),
	{
		ssr: false
		// Note: Removed loading here - Suspense fallback will handle all loading states uniformly
	}
);

// Activity Modal
export const LazyActivityModal = dynamic(
	() => import('../pages/dashboard/activity-modal').then((mod) => ({ default: mod.ActivityModal })),
	{
		ssr: false
		// Note: No loading property for conditional components
	}
);

// Collaborate Component
export const LazyCollaborate = dynamic(() => import('../collaborate'), {
	ssr: false
	// Note: Removed loading here - Suspense fallback will handle all loading states uniformly
});

// User Navigation
export const LazyUserNavAvatar = dynamic(
	() => import('../users/user-nav-menu').then((mod) => ({ default: mod.UserNavAvatar })),
	{
		ssr: false
		// Note: Removed loading here - Suspense fallback will handle all loading states uniformly
	}
);

// Auth User Task Input
export const LazyAuthUserTaskInput = dynamic(
	() => import('@/core/components/auth/auth-user-task-input').then((mod) => ({ default: mod.AuthUserTaskInput })),
	{
		ssr: false,
		loading: () => <AuthUserTaskInputSkeleton />
	}
);
