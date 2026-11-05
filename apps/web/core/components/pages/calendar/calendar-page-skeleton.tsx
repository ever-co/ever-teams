'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import {
	SetupFullCalendarSkeleton,
	SetupTimeSheetSkeleton
} from '@/core/components/common/skeleton/calendar-component-skeletons';

/** The key `app/[locale]/(main)/calendar/page.tsx` keeps its last view under. */
const CALENDAR_VIEW_KEY = 'calendar-timesheet';

const STORED_TIMESHEET_VIEWS = new Set(['"TimeSheet"', 'TimeSheet']);

const TEAM_VIEW_SEGMENTS = [{}, {}, {}, {}];

const CALENDAR_VIEW_SEGMENTS = [{}, {}];

const TIMESHEET_SEGMENT_INDEX = 0;

const CALENDAR_SEGMENT_INDEX = 1;

const ADD_TIME_WIDTHS = ['w-22'];

function subscribeToNothing() {
	return () => {};
}

function readStoredIsTimesheet() {
	try {
		const stored = window.localStorage.getItem(CALENDAR_VIEW_KEY);
		const storedView = stored ?? '';
		return STORED_TIMESHEET_VIEWS.has(storedView);
	} catch {
		return false;
	}
}

function readServerIsTimesheet() {
	return false;
}

/** Read only: `useLocalStorageState` rewrites legacy values, which a skeleton must not do. */
function useStoredTimesheetView() {
	return useSyncExternalStore(subscribeToNothing, readStoredIsTimesheet, readServerIsTimesheet);
}

function viewSegmentIndexOf(isTimesheet: boolean) {
	if (isTimesheet) {
		return TIMESHEET_SEGMENT_INDEX;
	}
	return CALENDAR_SEGMENT_INDEX;
}

export function CalendarToolbarSkeleton({ isTimesheet }: Readonly<{ isTimesheet: boolean }>) {
	const t = useTranslations();
	let title = t('common.CALENDAR');
	if (isTimesheet) {
		title = t('pages.timesheet.TIMESHEET_TITLE');
	}
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex flex-col gap-3 py-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-lg font-semibold text-balance">{title}</h1>
					<div className="flex flex-wrap items-center gap-2">
						<SegmentedControlSkeleton segments={TEAM_VIEW_SEGMENTS} />
						<SegmentedControlSkeleton
							segments={CALENDAR_VIEW_SEGMENTS}
							pickedIndex={viewSegmentIndexOf(isTimesheet)}
						/>
						<ToolbarPills widths={ADD_TIME_WIDTHS} />
					</div>
				</div>
				<p className="rounded-lg bg-info/10 px-3 py-2 text-sm text-info-foreground">
					{t('common.CALENDAR_SAMPLE_DATA')}
				</p>
			</div>
		</div>
	);
}

export function CalendarPageSkeleton() {
	const isTimesheet = useStoredTimesheetView();
	return (
		<PageSkeletonFrame toolbar={<CalendarToolbarSkeleton isTimesheet={isTimesheet} />}>
			{isTimesheet && <SetupTimeSheetSkeleton />}
			{!isTimesheet && <SetupFullCalendarSkeleton />}
		</PageSkeletonFrame>
	);
}
