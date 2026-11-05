import dynamic from 'next/dynamic';
import { SetupFullCalendarSkeleton, SetupTimeSheetSkeleton } from '../common/skeleton/calendar-component-skeletons';
// import { CalendarViewSkeleton } from '../common/skeleton/calendar-view-skeleton';

// Calendar Components
export const LazySetupFullCalendar = dynamic(
	() => import('@/core/components/integration/calendar').then((mod) => ({ default: mod.SetupFullCalendar })),
	{
		ssr: false,
		loading: () => <SetupFullCalendarSkeleton />
	}
);

export const LazySetupTimeSheet = dynamic(
	() => import('@/core/components/integration/calendar').then((mod) => ({ default: mod.SetupTimeSheet })),
	{
		ssr: false,
		loading: () => <SetupTimeSheetSkeleton />
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

// Timesheet Calendar View
export const LazyCalendarView = dynamic(
	() => import('@/core/components/pages/timesheet/calendar-view').then((mod) => ({ default: mod.CalendarView })),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-96 bg-foreground/5 animate-pulse rounded-xl flex items-center justify-center">
				<div className="text-sm text-muted-foreground">Loading Calendar...</div>
			</div>
		)
	}
);

// Timesheet Components
export const LazyTimesheetView = dynamic(
	() => import('@/core/components/pages/timesheet/timesheet-view').then((mod) => ({ default: mod.TimesheetView })),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-64 bg-foreground/5 animate-pulse rounded-xl flex items-center justify-center">
				<div className="text-sm text-muted-foreground">Loading Timesheet...</div>
			</div>
		)
	}
);

export const LazyTimesheetDetailModal = dynamic(
	() => import('@/core/components/pages/timesheet/timesheet-detail-modal').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => (
			<div className="w-96 h-64 bg-foreground/5 animate-pulse rounded-2xl flex items-center justify-center">
				<div className="text-sm text-muted-foreground">Loading Modal...</div>
			</div>
		)
	}
);

export const LazyTimesheetFilter = dynamic(
	() =>
		import('@/core/components/pages/timesheet/timesheet-filter').then((mod) => ({ default: mod.TimesheetFilter })),
	{
		ssr: false,
		loading: () => <div className="w-48 h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyTimesheetCard = dynamic(
	() => import('@/core/components/pages/timesheet/timesheet-card').then((mod) => ({ default: mod.TimesheetCard })),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-32 bg-foreground/5 animate-pulse rounded-xl flex items-center justify-center">
				<div className="text-sm text-muted-foreground">Loading Card...</div>
			</div>
		)
	}
);

export const LazyTimesheetPagination = dynamic(
	() => import('@/core/components/timesheet/timesheet-pagination').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <div className="w-64 h-10 bg-foreground/5 animate-pulse rounded-md" />
	}
);
