'use client';

import { type ReactNode, Suspense, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, Users } from '@/core/components/icons';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_STACK, DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { TimesheetsDialogs } from '@/core/components/dashboards/timesheets/timesheets-dialogs';
import { AddManualTimeModalSkeleton } from '@/core/components/common/skeleton/calendar-component-skeletons';
import { LazyAddManualTimeModal } from '@/core/components/optimized-components/calendar';
import { useModal } from '@/core/hooks/common/use-modal';
import { type CalendarEntryMoves, useCalendarEntryMoves } from '@/core/hooks/calendar/use-calendar-entry-moves';
import { useCalendarPage, type CalendarPageState } from '@/core/hooks/calendar/use-calendar-page';
import { useTimesheetDialogs } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import { useTimesheetLogActions } from '@/core/hooks/dashboards/timesheets/use-timesheet-log-actions';
import { canEditLog } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	type AddTimeRange,
	addTimeRangeBetween,
	addTimeRangeFrom,
	type CalendarDay,
	type CalendarView,
	countedDaysOf,
	projectTotalsOf
} from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { type TimesheetFormatters, timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { EntryHandlers } from './calendar-entry-parts';
import { CalendarDayPanel } from './calendar-day-panel';
import { CalendarPageSkeleton } from './calendar-page-skeleton';
import { DayPlanBlock, DaySummary } from './calendar-day-details';
import { CalendarMonthView } from './calendar-month-view';
import { CalendarProjectLegend } from './calendar-project-legend';
import { CalendarTimeGrid } from './calendar-time-grid';
import { CalendarLegend, CalendarMemberSwitch, CalendarRangeStepper, CalendarViewSwitch } from './calendar-toolbar';
import { CalendarWeekStrip } from './calendar-week-strip';

type Translate = ReturnType<typeof useTranslations>;

const PAGE_PATH = '/calendar';

/** The first crumb is stored as a JSON list in the locale files (`pages.home.BREADCRUMB`), as the old page read it. */
function firstCrumbOf(raw: string) {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			const first: unknown = parsed[0];
			if (typeof first === 'string') {
				return first;
			}
		}
	} catch {
		return raw;
	}
	return raw;
}

function rangeNameOf(
	view: CalendarView,
	anchor: Date,
	range: Period,
	formatters: TimesheetFormatters,
	locale: string,
	t: Translate
) {
	if (view === 'month') {
		return formatters.monthTitle(anchor);
	}
	if (view === 'week') {
		return formatPeriod(range, locale);
	}
	const weekday = formatters.weekdayShort(anchor);
	const dayDate = formatters.dayDate(anchor);
	return t('dashboard.timesheets.DAY_LABEL', { day: weekday, date: dayDate });
}

function emptyTitleOf(view: CalendarView, rangeName: string, t: Translate) {
	if (view === 'month') {
		return t('dashboard.calendar.EMPTY_MONTH', { month: rangeName });
	}
	if (view === 'week') {
		return t('dashboard.calendar.EMPTY_PERIOD', { period: rangeName });
	}
	return t('dashboard.calendar.EMPTY_DAY', { day: rangeName });
}

/** The quiet bar on top of the grid: what an empty range means and how to add time, the legend on the right. */
function CalendarSurfaceHeader({ notice }: Readonly<{ notice: ReactNode }>) {
	return (
		<div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 hairline-b border-border px-4 py-2">
			<div className="min-w-0">{notice}</div>
			<CalendarLegend />
		</div>
	);
}

function EmptyNotice({ title, onAddTime }: Readonly<{ title: string; onAddTime: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<p className="text-[13px] font-medium text-foreground">{title}</p>
			<p className="text-xs text-muted-foreground">{t('dashboard.calendar.EMPTY_MESSAGE')}</p>
			<Button type="button" variant="outline" size="sm" onClick={onAddTime}>
				<Plus />
				<span>{t('dashboard.timesheets.ADD_TIME')}</span>
			</Button>
		</div>
	);
}

function DayAside({ day }: Readonly<{ day: CalendarDay | undefined }>) {
	if (!day) {
		return null;
	}
	return (
		<aside className="flex flex-col gap-4 p-4 max-lg:hairline-t lg:hairline-l border-border">
			<DaySummary day={day} />
			<DayPlanBlock day={day} />
		</aside>
	);
}

function CalendarBody({
	page,
	formatters,
	handlers,
	panelHandlers,
	moves,
	rangeName,
	onAddTime,
	onAddTimeRange,
	onAddTimeNow
}: Readonly<{
	page: CalendarPageState;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	panelHandlers: EntryHandlers;
	moves: CalendarEntryMoves;
	rangeName: string;
	onAddTime: (start: Date) => void;
	onAddTimeRange: (range: TimeWindow) => void;
	onAddTimeNow: () => void;
}>) {
	const t = useTranslations();
	const shownView = page.shownView;
	const isMonth = shownView === 'month';
	const isWeek = shownView === 'week';
	const isDay = shownView === 'day';
	const showsEmpty = page.isEmpty && !page.isLoading;
	const emptyTitle = emptyTitleOf(shownView, rangeName, t);
	let notice: ReactNode = null;
	if (showsEmpty) {
		notice = <EmptyNotice title={emptyTitle} onAddTime={onAddTimeNow} />;
	}
	const { days, shownAnchor } = page;
	// The same days as the toolbar's total, so the projects' times add up to it.
	const projectTotals = useMemo(() => {
		const countedDays = countedDaysOf(shownView, days, shownAnchor);
		return projectTotalsOf(countedDays);
	}, [days, shownAnchor, shownView]);
	const showsProjects = !page.isLoading;

	return (
		<section aria-label={rangeName} className={DASHBOARD_SURFACE}>
			<CalendarSurfaceHeader notice={notice} />
			{showsProjects && <CalendarProjectLegend totals={projectTotals} />}
			{isMonth && (
				<>
					<div className="max-sm:hidden">
						<CalendarMonthView
							days={page.days}
							anchor={page.shownAnchor}
							formatters={formatters}
							isLoading={page.isLoading}
							onOpenDay={page.openDayPanel}
						/>
					</div>
					<div className="sm:hidden">
						<CalendarWeekStrip
							days={page.days}
							selectedDay={page.selectedDay}
							weekStartsOn={page.weekStartsOn}
							formatters={formatters}
							handlers={handlers}
							isLoading={page.isLoading}
							onSelectDay={page.selectDay}
							onAddTime={onAddTime}
						/>
					</div>
				</>
			)}
			{isWeek && (
				<CalendarTimeGrid
					days={page.days}
					formatters={formatters}
					handlers={handlers}
					timeZone={page.timeZone}
					isLoading={page.isLoading}
					moves={moves}
					onAddTime={onAddTime}
					onAddTimeRange={onAddTimeRange}
					onOpenDay={page.openDayView}
				/>
			)}
			{isDay && (
				<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
					<CalendarTimeGrid
						days={page.days}
						formatters={formatters}
						handlers={handlers}
						timeZone={page.timeZone}
						isLoading={page.isLoading}
						moves={moves}
						onAddTime={onAddTime}
						onAddTimeRange={onAddTimeRange}
					/>
					{!page.isLoading && <DayAside day={page.days[0]} />}
				</div>
			)}
			<CalendarDayPanel
				day={page.panelDay}
				formatters={formatters}
				handlers={panelHandlers}
				onClose={page.closeDayPanel}
				onAddTime={onAddTime}
			/>
		</section>
	);
}

/**
 * Where a member's time went, day by day, against what they planned. Every member opens their own calendar; a
 * manager of the active team (or an organisation role) can switch to another member. Add time is the old page's
 * manual time dialog with the same props; edit and delete are the Timesheets page's dialogs.
 */
export function CalendarPage() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const page = useCalendarPage();
	const dialogs = useTimesheetDialogs();
	const { deleteLogs, isDeleting } = useTimesheetLogActions();
	const { isOpen: isAddTimeOpen, openModal: openAddTime, closeModal: closeAddTime } = useModal();
	const [addTimeRange, setAddTimeRange] = useState<AddTimeRange | null>(null);
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);

	const { permissions, closeDayPanel } = page;
	const { openEdit, openDelete } = dialogs;

	const handlers = useMemo<EntryHandlers>(
		() => ({
			canEdit: (log: ITimeLog) => canEditLog(log, permissions),
			onEdit: openEdit,
			onDelete: (log: ITimeLog) => openDelete([log], 'row')
		}),
		[openDelete, openEdit, permissions]
	);

	const panelHandlers = useMemo<EntryHandlers>(
		() => ({
			canEdit: handlers.canEdit,
			onEdit: (log: ITimeLog) => {
				closeDayPanel();
				handlers.onEdit(log);
			},
			onDelete: (log: ITimeLog) => {
				closeDayPanel();
				handlers.onDelete(log);
			}
		}),
		[closeDayPanel, handlers]
	);

	const openAddTimeNow = useCallback(() => {
		setAddTimeRange(null);
		openAddTime();
	}, [openAddTime]);

	const openAddTimeAt = useCallback(
		(start: Date) => {
			closeDayPanel();
			const range = addTimeRangeFrom(start);
			setAddTimeRange(range);
			openAddTime();
		},
		[closeDayPanel, openAddTime]
	);

	const openAddTimeIn = useCallback(
		(dragged: TimeWindow) => {
			closeDayPanel();
			const range = addTimeRangeBetween(dragged.start, dragged.end);
			setAddTimeRange(range);
			openAddTime();
		},
		[closeDayPanel, openAddTime]
	);

	const moves = useCalendarEntryMoves(page, handlers.canEdit);

	const handleDeleteConfirmed = useCallback(async () => {
		await deleteLogs(dialogs.deleteTarget.logIds, true);
	}, [deleteLogs, dialogs.deleteTarget.logIds]);

	const handleRejected = useCallback(() => undefined, []);

	if (!page.isTeamReady) {
		return <CalendarPageSkeleton />;
	}

	const title = t('common.CALENDAR');
	const rangeName = rangeNameOf(page.view, page.anchor, page.range, formatters, locale, t);
	const shownRangeName = rangeNameOf(page.shownView, page.shownAnchor, page.shownRange, formatters, locale, t);
	const trackedTotal = formatDurationShort(page.trackedSeconds);
	const trackedText = t('dashboard.calendar.TRACKED_TOTAL', { total: trackedTotal });
	const meta = `${shownRangeName} · ${trackedText}`;
	const showsMemberSwitch = page.canSwitchMember && page.members.length > 0;
	const showsCalendar = !page.showsError && !page.isMemberUnknown;

	const rootCrumbSource = t('pages.home.BREADCRUMB');
	const rootCrumb = firstCrumbOf(rootCrumbSource);
	const breadcrumbPaths = [
		{ title: rootCrumb, href: '/' },
		{ title: page.teamName, href: '/' },
		{ title, href: `/${locale}${PAGE_PATH}` }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={meta}
					isMetaLoading={page.isLoading}
					isUpdating={page.isUpdating}
					updatingLabel={t('dashboard.calendar.UPDATING')}
					actions={
						<Button type="button" variant="default" size="default" onClick={openAddTimeNow}>
							<Plus />
							<span>{t('dashboard.timesheets.ADD_TIME')}</span>
						</Button>
					}
					controls={
						<>
							<CalendarRangeStepper
								view={page.view}
								rangeName={rangeName}
								onPrevious={page.showPrevious}
								onToday={page.showToday}
								onNext={page.showNext}
							/>
							{showsMemberSwitch && (
								<CalendarMemberSwitch
									members={page.members}
									shownMember={page.shownMember}
									ownEmployeeId={page.ownEmployeeId}
									onPick={page.pickMember}
								/>
							)}
						</>
					}
					trailingControls={<CalendarViewSwitch view={page.view} onChange={page.changeView} />}
				/>
			}
		>
			<div className={DASHBOARD_STACK}>
				{page.showsError && <DashboardErrorNotice onRetry={page.refetch} />}
				{page.isMemberUnknown && (
					<DashboardSection>
						<BlockEmptyMessage
							title={t('dashboard.calendar.NO_MEMBER_TITLE')}
							message={t('dashboard.calendar.NO_MEMBER_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsCalendar && (
					<CalendarBody
						page={page}
						formatters={formatters}
						handlers={handlers}
						panelHandlers={panelHandlers}
						moves={moves}
						rangeName={shownRangeName}
						onAddTime={openAddTimeAt}
						onAddTimeRange={openAddTimeIn}
						onAddTimeNow={openAddTimeNow}
					/>
				)}
			</div>
			{isAddTimeOpen && (
				<Suspense fallback={<AddManualTimeModalSkeleton />}>
					<LazyAddManualTimeModal
						closeModal={closeAddTime}
						isOpen={isAddTimeOpen}
						params="AddManuelTime"
						timeSheetStatus="ManagerTimesheet"
						initialStart={addTimeRange?.start}
						initialEnd={addTimeRange?.end}
					/>
				</Suspense>
			)}
			<TimesheetsDialogs
				dialogs={dialogs}
				canAddTime={false}
				isDeleting={isDeleting}
				onRejected={handleRejected}
				onDeleteConfirmed={handleDeleteConfirmed}
			/>
		</PageLayout>
	);
}
