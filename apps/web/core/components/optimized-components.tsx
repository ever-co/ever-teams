import { ActivityCalendarSkeleton } from './common/skeleton/activity-calendar-skeleton';
import {
	AppsTabSkeleton,
	ScreenshootTabSkeleton,
	TaskCardSkeleton,
	TaskFilterSkeleton,
	UserProfileDetailSkeleton,
	UserProfileTaskSkeleton,
	VisitedSitesTabSkeleton,
	TaskCardBlockSKeleton,
	UserTeamActivitySkeleton
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

// Priority 4: Activity components (Tab-based lazy loading)
export const LazyUserWorkedTaskTab = dynamic(
	() => import('@/core/components/activities/user-worked-task').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <TaskCardBlockSKeleton />
	}
);

export const LazyUserTeamActivity = dynamic(
	() => import('@/core/components/activities/user-team-card-activity').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <UserTeamActivitySkeleton />
	}
);

// Priority 5: Core UI Components (Kanban, Task Details)
export const LazyKanbanView = dynamic(
	() => import('@/core/components/pages/kanban/team-members-kanban-view').then((mod) => mod.KanbanView),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-96 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Kanban...</div>
			</div>
		)
	}
);

export const LazyTaskDetailsComponent = dynamic(
	() => import('@/core/components/pages/task/task-details').then((mod) => mod.TaskDetailsComponent),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-96 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Task Details...</div>
			</div>
		)
	}
);

// Priority 6: Dashboard Components
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
					<div key={index} className="flex flex-col items-center gap-2">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>
		)
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

export const LazyGroupBySelectTimeActivity = dynamic(
	() =>
		import('@/core/components/pages/time-and-activity/group-by-select-time-activity').then(
			(mod) => mod.GroupBySelectTimeActivity
		),
	{
		ssr: false,
		loading: () => <div className="w-[180px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

// Priority 7: Task Components (Dropdowns and Properties)
export const LazyEpicPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.EpicPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

export const LazyStatusDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.StatusDropdown),
	{
		ssr: false,
		loading: () => <div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyTaskLabelsDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskLabelsDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

export const LazyTaskPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-2" />
			</div>
		)
	}
);

export const LazyTaskSizesDropdown = dynamic(
	() => import('@/core/components/tasks/task-sizes-dropdown').then((mod) => mod.TaskSizesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
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
