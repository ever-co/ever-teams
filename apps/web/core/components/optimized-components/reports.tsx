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
		loading: () => <div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyWeeklyLimitExportMenu = dynamic(
	() =>
		import('@/core/components/pages/reports/weekly-limit/weekly-limit-report-export-menu').then((mod) => ({
			default: mod.WeeklyLimitExportMenu
		})),
	{
		ssr: false,
		loading: () => <div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyTimeReportTable = dynamic(
	() =>
		import('@/core/components/pages/reports/weekly-limit/time-report-table').then((mod) => ({
			default: mod.TimeReportTable
		})),
	{
		ssr: false,
		loading: () => <div className="w-full h-64 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
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
		loading: () => <div className="w-[180px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

export const LazyCardTimeAndActivity = dynamic(() => import('../pages/time-and-activity/card-time-and-activity'), {
	ssr: false
});

export const LazyActivityTable = dynamic(() => import('../pages/time-and-activity/activity-table'), {
	ssr: false
});

export const LazyTimeActivityTable = dynamic(
	() => import('../pages/time-and-activity/time-activity-table').then((mod) => ({ default: mod.TimeActivityTable })),
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
		loading: () => <div className="w-full h-16 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

// Additional Reports Components
export const LazyDatePickerWithRange = dynamic(
	() => import('../common/date-range-select').then((mod) => ({ default: mod.DatePickerWithRange })),
	{
		ssr: false,
		loading: () => <div className="w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

export const LazyMembersSelect = dynamic(
	() =>
		import('../pages/reports/weekly-limit/members-select').then((mod) => ({
			default: mod.MembersSelect
		})),
	{
		ssr: false,
		loading: () => <div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);

export const LazyTimeReportTableByMember = dynamic(
	() =>
		import('../pages/reports/weekly-limit/time-report-table').then((mod) => ({
			default: mod.TimeReportTableByMember
		})),
	{
		ssr: false,
		loading: () => <div className="w-full h-64 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyPaginate = dynamic(
	() => import('../duplicated-components/_pagination').then((mod) => ({ default: mod.Paginate })),
	{
		ssr: false,
		loading: () => <div className="w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
	}
);
