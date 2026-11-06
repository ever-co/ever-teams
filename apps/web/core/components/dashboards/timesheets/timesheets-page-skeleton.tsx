'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK, DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import {
	ALL_STATUSES,
	statusSummaryOf,
	type TimesheetStatusFilter,
	type TimesheetView
} from '@/core/lib/utils/dashboards/timesheets';
import { TimesheetsCalendarSkeleton } from './timesheets-calendar';
import { ListColumns } from './timesheets-list';
import { TimesheetsSheetSkeleton } from './timesheets-sheet-view';
import { TimesheetsListSkeleton } from './timesheets-states';
import { TimesheetsStatusCards } from './timesheets-status-cards';
import { TimesheetsScreenshotsSkeleton } from './timesheets-screenshots-view';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-33.75', 'w-21', 'w-64'];

const TRAILING_WIDTHS = ['w-60'];

const NO_LOGS_SUMMARY = statusSummaryOf([]);

function keepStatus() {
	return undefined;
}

function LoadingBody({ view, showsMember }: Readonly<{ view: TimesheetView; showsMember: boolean }>) {
	if (view === 'sheet') {
		return <TimesheetsSheetSkeleton />;
	}
	if (view === 'week') {
		return <TimesheetsCalendarSkeleton view="week" />;
	}
	if (view === 'month') {
		return <TimesheetsCalendarSkeleton view="month" />;
	}
	if (view === 'screenshots') {
		return <TimesheetsScreenshotsSkeleton />;
	}
	return (
		<>
			<ListColumns showsMember={showsMember} />
			<TimesheetsListSkeleton showsMember={showsMember} />
		</>
	);
}

/**
 * Drawn by the route skeleton and by the page on its first load: one picture from the route to the data, the status
 * cards over the surface of the view.
 */
export function TimesheetsReportSkeleton({
	title,
	view = 'sheet',
	showsMember = true,
	statusFilter = ALL_STATUSES,
	onStatusChange = keepStatus
}: Readonly<{
	title: string;
	view?: TimesheetView;
	showsMember?: boolean;
	statusFilter?: TimesheetStatusFilter;
	onStatusChange?: (status: TimesheetStatusFilter) => void;
}>) {
	return (
		<>
			<TimesheetsStatusCards
				summary={NO_LOGS_SUMMARY}
				selected={statusFilter}
				onSelect={onStatusChange}
				isLoading
				isUnavailable={false}
			/>
			<section aria-label={title} aria-busy="true" className={DASHBOARD_SURFACE}>
				<LoadingBody view={view} showsMember={showsMember} />
			</section>
		</>
	);
}

/** Only managers reach the reports, so the first picture is the team's sheet with the member rail. */
export function TimesheetsPageSkeleton() {
	const t = useTranslations();
	const title = t('dashboard.timesheets.TITLE');
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={title}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<TimesheetsReportSkeleton title={title} />
			</div>
		</PageSkeletonFrame>
	);
}
