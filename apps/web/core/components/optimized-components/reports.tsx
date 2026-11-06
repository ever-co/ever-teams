import dynamic from 'next/dynamic';
// import { GroupBySelectSkeleton } from '../common/skeleton/group-by-select-skeleton';
// import { WeeklyLimitExportMenuSkeleton } from '../common/skeleton/weekly-limit-export-menu-skeleton';
// import { TimeReportTableSkeleton } from '../common/skeleton/time-report-table-skeleton';

// Reports Components
export const LazyGroupBySelect = dynamic(
	() =>
		import('@/core/components/pages/reports/weekly-limit/group-by-select').then((mod) => ({
			default: mod.GroupBySelect
		})),
	{
		ssr: false,
		loading: () => <div className="w-32 h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyWeeklyLimitExportMenu = dynamic(
	() =>
		import('@/core/components/pages/reports/weekly-limit/weekly-limit-report-export-menu').then((mod) => ({
			default: mod.WeeklyLimitExportMenu
		})),
	{
		ssr: false,
		loading: () => <div className="w-32 h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyTimeReportTable = dynamic(
	() =>
		import('@/core/components/pages/reports/weekly-limit/time-report-table').then((mod) => ({
			default: mod.TimeReportTable
		})),
	{
		ssr: false,
		loading: () => <div className="w-full h-64 bg-foreground/5 animate-pulse rounded-xl" />
	}
);

// Time and Activity Components
export const LazyGroupBySelectTimeActivity = dynamic(
	() =>
		import('@/core/components/pages/time-and-activity/group-by-select-time-activity').then(
			(mod) => mod.GroupBySelectTimeActivity
		),
	{
		ssr: false,
		loading: () => <div className="w-[180px] h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyCardTimeAndActivity = dynamic(() => import('../pages/time-and-activity/card-time-and-activity'), {
	ssr: false
});

export const LazyActivityTable = dynamic(() => import('../pages/time-and-activity/activity-table'), {
	ssr: false
});

/** @deprecated The weekly view now renders LazyWeeklyReportTable; kept for existing imports. */
export const LazyTimeActivityTable = dynamic(
	() => import('../pages/time-and-activity/time-activity-table').then((mod) => ({ default: mod.TimeActivityTable })),
	{
		ssr: false
	}
);

export const LazyWeeklyReportTable = dynamic(
	() => import('../pages/time-and-activity/weekly-report-table').then((mod) => ({ default: mod.WeeklyReportTable })),
	{
		ssr: false
	}
);

// Time Activity Header
export const LazyTimeActivityHeader = dynamic(
	() =>
		import('../pages/time-and-activity/time-activity-header').then((mod) => ({ default: mod.TimeActivityHeader })),
	{
		ssr: false,
		loading: () => <div className="w-full h-16 bg-foreground/5 animate-pulse rounded-lg" />
	}
);

// Additional Reports Components
export const LazyDatePickerWithRange = dynamic(
	() => import('../common/date-range-select').then((mod) => ({ default: mod.DatePickerWithRange })),
	{
		ssr: false,
		loading: () => <div className="w-64 h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyMembersSelect = dynamic(
	() =>
		import('../pages/reports/weekly-limit/members-select').then((mod) => ({
			default: mod.MembersSelect
		})),
	{
		ssr: false,
		loading: () => <div className="w-48 h-9 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyTimeReportTableByMember = dynamic(
	() =>
		import('../pages/reports/weekly-limit/time-report-table').then((mod) => ({
			default: mod.TimeReportTableByMember
		})),
	{
		ssr: false,
		loading: () => <div className="w-full h-64 bg-foreground/5 animate-pulse rounded-xl" />
	}
);

export const LazyPaginate = dynamic(
	() => import('../duplicated-components/_pagination').then((mod) => ({ default: mod.Paginate })),
	{
		ssr: false,
		loading: () => <div className="w-64 h-10 bg-foreground/5 animate-pulse rounded-md" />
	}
);
