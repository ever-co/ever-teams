'use client';

import { memo, useMemo } from 'react';
import { getISOWeek } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection, ReportHeaderRow, ReportTotalsRow } from '@/core/components/dashboards/kit/dashboard-layout';
import {
	BlockEmptyMessage,
	DashboardErrorNotice,
	RowsSkeleton
} from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import type { TimeActivityRequest } from '@/core/hooks/dashboards/time-activity/use-time-activity-queries';
import { type WeekDayColumn, useTimeActivityWeek } from '@/core/hooks/dashboards/time-activity/use-time-activity-week';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import type { WeekGridRow } from '@/core/lib/utils/dashboards/time-activity';

const WEEK_GRID =
	'grid min-w-[44rem] grid-cols-[minmax(10rem,1.6fr)_repeat(7,minmax(3.75rem,1fr))_5.5rem] items-center gap-x-2 px-4';

const STEP_BUTTON =
	'inline-flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4';

function dayCellClassOf(column: WeekDayColumn) {
	const isQuiet = !column.isInPeriod || column.isFuture;
	return cn('text-right text-[13px] tabular-nums', isQuiet && 'text-muted-foreground/50');
}

function DayCell({ column, seconds }: Readonly<{ column: WeekDayColumn; seconds: number }>) {
	const isQuiet = !column.isInPeriod || column.isFuture;
	if (isQuiet) {
		return <span role="cell" className={dayCellClassOf(column)} />;
	}
	const isEmpty = seconds <= 0;
	if (isEmpty) {
		return (
			<span role="cell" className="text-right text-[13px] tabular-nums text-muted-foreground/60">
				{formatHoursLabel(0)}
			</span>
		);
	}
	return (
		<span role="cell" className="text-right text-[13px] tabular-nums text-foreground">
			{formatDurationShort(seconds)}
		</span>
	);
}

const WeekRow = memo(function WeekRow({
	row,
	columns,
	unnamed
}: Readonly<{ row: WeekGridRow; columns: ReadonlyArray<WeekDayColumn>; unnamed: string }>) {
	return (
		<div
			role="row"
			className={cn(WEEK_GRID, 'min-h-11 [contain-intrinsic-size:auto_2.75rem] [content-visibility:auto]')}
		>
			<span role="rowheader" className="min-w-0">
				<MemberCell name={row.name || unnamed} imageUrl={row.imageUrl} />
			</span>
			{columns.map((column, index) => (
				<DayCell key={column.key} column={column} seconds={row.seconds[index] ?? 0} />
			))}
			<span role="cell" className="text-right text-[13px] font-medium tabular-nums text-foreground">
				{formatDurationShort(row.total)}
			</span>
		</div>
	);
});

function outsideTitleOf(isOutside: boolean, outsideLabel: string) {
	if (isOutside) {
		return outsideLabel;
	}
	return undefined;
}

function DayHeader({
	column,
	format,
	outsideLabel
}: Readonly<{ column: WeekDayColumn; format: Intl.DateTimeFormat; outsideLabel: string }>) {
	const isOutside = !column.isInPeriod;
	const title = outsideTitleOf(isOutside, outsideLabel);
	return (
		<span
			role="columnheader"
			title={title}
			className={cn('text-right', column.isToday && 'text-primary-ink', isOutside && 'text-muted-foreground/50')}
		>
			{format.format(column.date)}
		</span>
	);
}

/** Days outside the period stay as empty columns, so every week of a long period keeps the same shape. */
export function TimeActivityWeekGrid({
	period,
	request,
	userId,
	hasTaskFilter
}: Readonly<{
	period: Period;
	request: TimeActivityRequest | null;
	userId: string | undefined;
	hasTaskFilter: boolean;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const week = useTimeActivityWeek({ period, request, userId });
	const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }), [locale]);
	const windowText = formatPeriod(week.window, locale);
	const weekNumber = getISOWeek(week.weekStart);
	const unnamed = t('timeActivity.UNNAMED_EMPLOYEE');
	const outsideLabel = t('dashboard.timeActivity.week.OUTSIDE_PERIOD');
	const hasRows = week.rows.length > 0;
	const showsRows = hasRows && !week.isLoading;
	const showsEmpty = !hasRows && !week.isLoading && !week.isError;
	const showsError = week.isError && !week.isLoading;
	const showsGrid = !showsError && !showsEmpty;

	return (
		<DashboardSection
			title={t('dashboard.timeActivity.week.TITLE')}
			ariaLabel={t('dashboard.timeActivity.week.TITLE')}
			meta={hasTaskFilter && t('dashboard.timeActivity.week.TASK_FILTER_NOTE')}
			actions={
				<div
					className="flex items-center gap-1"
					role="group"
					aria-label={t('dashboard.timeActivity.week.TITLE')}
				>
					<button
						type="button"
						className={STEP_BUTTON}
						onClick={week.goPrevious}
						disabled={!week.canGoPrevious}
						aria-label={t('timeActivity.PREVIOUS_WEEK')}
					>
						<ChevronLeft />
					</button>
					<span className="flex items-baseline gap-1.5 px-1 text-[13px] font-medium tabular-nums text-foreground">
						{windowText}
						<span className="text-xs font-normal text-muted-foreground">
							{t('dashboard.timeActivity.week.WEEK_NUMBER', { week: weekNumber })}
						</span>
					</span>
					<button
						type="button"
						className={STEP_BUTTON}
						onClick={week.goNext}
						disabled={!week.canGoNext}
						aria-label={t('timeActivity.NEXT_WEEK')}
					>
						<ChevronRight />
					</button>
				</div>
			}
		>
			{showsError && <DashboardErrorNotice onRetry={() => void week.refetch()} className="m-3" />}
			{showsEmpty && (
				<BlockEmptyMessage title={t('dashboard.timeActivity.empty.TITLE', { period: windowText })} />
			)}
			{showsGrid && (
				<div
					role="table"
					aria-label={t('dashboard.timeActivity.week.TITLE')}
					className="-mx-px overflow-x-auto px-px"
				>
					<ReportHeaderRow gridClassName={WEEK_GRID}>
						<span role="columnheader">{t('common.MEMBER')}</span>
						{week.columns.map((column) => (
							<DayHeader
								key={column.key}
								column={column}
								format={dayFormat}
								outsideLabel={outsideLabel}
							/>
						))}
						<span role="columnheader" className="text-right">
							{t('common.TOTAL')}
						</span>
					</ReportHeaderRow>
					{week.isLoading && <RowsSkeleton gridClassName={WEEK_GRID} cellCount={9} />}
					{showsRows && (
						<>
							<div className="hairline-divide-y divide-border">
								{week.rows.map((row) => (
									<WeekRow key={row.employeeId} row={row} columns={week.columns} unnamed={unnamed} />
								))}
							</div>
							<ReportTotalsRow gridClassName={WEEK_GRID}>
								<span role="rowheader" className="flex min-w-0 items-baseline gap-2">
									<span>{t('common.TOTAL')}</span>
									<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
										{t('dashboard.timeActivity.table.MEMBERS', { count: week.rows.length })}
									</span>
								</span>
								{week.columns.map((column, index) => (
									<DayCell key={column.key} column={column} seconds={week.columnTotals[index] ?? 0} />
								))}
								<span role="cell" className="text-right tabular-nums">
									{formatDurationShort(week.grandTotal)}
								</span>
							</ReportTotalsRow>
						</>
					)}
				</div>
			)}
		</DashboardSection>
	);
}
