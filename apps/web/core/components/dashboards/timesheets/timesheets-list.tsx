'use client';

import { memo, type ReactNode, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { Button } from '@/core/components/duplicated-components/_button';
import { GroupToggle, ReportGroup, ReportHeaderRow } from '@/core/components/dashboards/kit/dashboard-layout';
import { NUMBER_CELL } from '@/core/components/dashboards/kit/recipes';
import { ChevronDown, ChevronUp } from '@/core/components/icons';
import { DAYS_PER_STEP, type TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { cn } from '@/core/lib/helpers';
import { scrollBehavior } from '@/core/lib/utils/motion';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type {
	TimesheetDay,
	TimesheetFormatters,
	TimesheetSort,
	TimesheetSortKey
} from '@/core/lib/utils/dashboards/timesheets';
import { dayLabelOf } from './timesheet-day-label';
import { TimesheetLogRow, type TimesheetRowHandlers } from './timesheet-log-row';
import { DAY_SUMMARY_SPAN, dayLabelSpanOf, logGridOf, WIDE_ONLY } from './timesheets-grid';

export function dayAnchorIdOf(dayKey: string) {
	return `timesheet-day-${dayKey}`;
}

interface DaySelection {
	isChecked: boolean;
	isPartial: boolean;
}

function daySelectionOf(day: TimesheetDay, selectedIdSet: ReadonlySet<string>): DaySelection {
	let selectedCount = 0;
	for (const log of day.logs) {
		if (selectedIdSet.has(log.id)) {
			selectedCount += 1;
		}
	}
	const isChecked = selectedCount === day.logs.length;
	const hasSome = selectedCount > 0;
	const isPartial = hasSome && !isChecked;
	return { isChecked, isPartial };
}

type AriaSort = 'ascending' | 'descending' | 'none';

function ariaSortOf(sort: TimesheetSort | null, key: TimesheetSortKey): AriaSort {
	const isSorted = sort?.key === key;
	if (!isSorted) {
		return 'none';
	}
	if (sort?.direction === 'asc') {
		return 'ascending';
	}
	return 'descending';
}

function SortGlyph({ ariaSort }: Readonly<{ ariaSort: AriaSort }>) {
	if (ariaSort === 'ascending') {
		return <ChevronUp className="size-3.5" />;
	}
	if (ariaSort === 'descending') {
		return <ChevronDown className="size-3.5" />;
	}
	return null;
}

function SortableHeader({
	label,
	sortKey,
	sort,
	onSort,
	alignsEnd = false
}: Readonly<{
	label: string;
	sortKey: TimesheetSortKey;
	sort: TimesheetSort | null;
	onSort?: (key: TimesheetSortKey) => void;
	alignsEnd?: boolean;
}>) {
	const ariaSort = ariaSortOf(sort, sortKey);
	if (!onSort) {
		return (
			<span role="columnheader" className={cn(alignsEnd && 'text-right')}>
				{label}
			</span>
		);
	}
	return (
		<span role="columnheader" aria-sort={ariaSort} className={cn('flex min-w-0', alignsEnd && 'justify-end')}>
			<button
				type="button"
				onClick={() => onSort(sortKey)}
				className="-mx-1 inline-flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="truncate">{label}</span>
				<SortGlyph ariaSort={ariaSort} />
			</button>
		</span>
	);
}

/** The column labels of the list; with `onSort` each label sorts the logs of every day by its column. */
export function ListColumns({
	showsMember,
	sort = null,
	onSort
}: Readonly<{ showsMember: boolean; sort?: TimesheetSort | null; onSort?: (key: TimesheetSortKey) => void }>) {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={logGridOf(showsMember)} className={WIDE_ONLY}>
			<span aria-hidden="true" />
			<SortableHeader
				label={t('dashboard.timesheets.COLUMNS.STATUS')}
				sortKey="status"
				sort={sort}
				onSort={onSort}
			/>
			<SortableHeader label={t('dashboard.timesheets.COLUMNS.TASK')} sortKey="task" sort={sort} onSort={onSort} />
			<SortableHeader
				label={t('dashboard.timesheets.COLUMNS.PROJECT')}
				sortKey="project"
				sort={sort}
				onSort={onSort}
			/>
			{showsMember && (
				<SortableHeader
					label={t('dashboard.timesheets.COLUMNS.MEMBER')}
					sortKey="member"
					sort={sort}
					onSort={onSort}
				/>
			)}
			<SortableHeader label={t('dashboard.timesheets.COLUMNS.TIME')} sortKey="time" sort={sort} onSort={onSort} />
			<SortableHeader
				label={t('dashboard.timesheets.COLUMNS.DURATION')}
				sortKey="duration"
				sort={sort}
				onSort={onSort}
				alignsEnd
			/>
			<span aria-hidden="true" />
		</ReportHeaderRow>
	);
}

const TimesheetDayGroup = memo(function TimesheetDayGroup({
	day,
	isOpen,
	onToggleDay,
	onSelectDay,
	showsMember,
	selectedIdSet,
	permissions,
	formatters,
	handlers
}: Readonly<{
	day: TimesheetDay;
	isOpen: boolean;
	onToggleDay: (dayKey: string) => void;
	onSelectDay: (logIds: string[], shouldSelect: boolean) => void;
	showsMember: boolean;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: TimesheetFormatters;
	handlers: TimesheetRowHandlers;
}>) {
	const t = useTranslations();
	const label = dayLabelOf(day.date, t, formatters);
	const selection = daySelectionOf(day, selectedIdSet);
	const logIds = day.logs.map((log) => log.id);
	const logCount = t('dashboard.timesheets.LOG_COUNT', { count: day.logs.length });
	const dayTotal = formatDurationShort(day.totalSeconds);

	const header = (
		<>
			<span role="cell" className="flex items-center">
				<Checkbox
					checked={selection.isChecked}
					indeterminate={selection.isPartial}
					onCheckedChange={(checked) => onSelectDay(logIds, checked)}
					aria-label={t('dashboard.timesheets.SELECT_DAY', { day: label })}
				/>
			</span>
			<span role="rowheader" className={cn('flex min-w-0 items-center', dayLabelSpanOf(showsMember))}>
				<GroupToggle isOpen={isOpen} onToggle={() => onToggleDay(day.key)}>
					<span className="truncate">{label}</span>
				</GroupToggle>
			</span>
			<span
				role="cell"
				className={cn(NUMBER_CELL, DAY_SUMMARY_SPAN, 'flex items-center justify-end gap-1.5 whitespace-nowrap')}
			>
				<span className="text-xs text-muted-foreground">{logCount}</span>
				<span aria-hidden="true" className="text-xs text-muted-foreground">
					·
				</span>
				<span className="font-semibold text-foreground">{dayTotal}</span>
			</span>
			<span aria-hidden="true" />
		</>
	);

	return (
		<div id={dayAnchorIdOf(day.key)} className="scroll-mt-12">
			<ReportGroup isOpen={isOpen} header={header} headerClassName={logGridOf(showsMember)}>
				<div className="hairline-divide-y divide-border">
					{day.logs.map((log) => (
						<TimesheetLogRow
							key={log.id}
							log={log}
							isSelected={selectedIdSet.has(log.id)}
							showsMember={showsMember}
							permissions={permissions}
							formatters={formatters}
							handlers={handlers}
						/>
					))}
				</div>
			</ReportGroup>
		</div>
	);
});

/**
 * The list view: one group per day the time was worked, most recent first, each with its own select-all, its
 * number of logs and its total; the first days render at once and the rest come with "Show more days".
 */
export function TimesheetsList({
	days,
	visibleDayCount,
	collapsedDayKeys,
	onToggleDay,
	onShowMoreDays,
	onSelectDay,
	showsMember,
	selectedIdSet,
	permissions,
	formatters,
	handlers,
	focusedDayKey,
	onFocusHandled,
	sort,
	onSort,
	emptyContent
}: Readonly<{
	days: ReadonlyArray<TimesheetDay>;
	visibleDayCount: number;
	collapsedDayKeys: ReadonlyArray<string>;
	onToggleDay: (dayKey: string) => void;
	onShowMoreDays: () => void;
	onSelectDay: (logIds: string[], shouldSelect: boolean) => void;
	showsMember: boolean;
	selectedIdSet: ReadonlySet<string>;
	permissions: TimesheetPermissions;
	formatters: TimesheetFormatters;
	handlers: TimesheetRowHandlers;
	focusedDayKey: string | null;
	onFocusHandled: () => void;
	sort: TimesheetSort | null;
	onSort: (key: TimesheetSortKey) => void;
	emptyContent: ReactNode;
}>) {
	const t = useTranslations();
	const shownDays = days.slice(0, visibleDayCount);
	const hiddenDayCount = days.length - shownDays.length;
	const hasHiddenDays = hiddenDayCount > 0;
	const nextStepCount = Math.min(hiddenDayCount, DAYS_PER_STEP);
	const hasDays = days.length > 0;

	useEffect(() => {
		if (!focusedDayKey) {
			return;
		}
		const anchor = document.getElementById(dayAnchorIdOf(focusedDayKey));
		anchor?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
		onFocusHandled();
	}, [focusedDayKey, onFocusHandled]);

	return (
		<div role="table" aria-label={t('dashboard.timesheets.TITLE')}>
			<ListColumns showsMember={showsMember} sort={sort} onSort={onSort} />
			{!hasDays && emptyContent}
			{hasDays && (
				<div className="hairline-divide-y divide-border">
					{shownDays.map((day) => (
						<TimesheetDayGroup
							key={day.key}
							day={day}
							isOpen={!collapsedDayKeys.includes(day.key)}
							onToggleDay={onToggleDay}
							onSelectDay={onSelectDay}
							showsMember={showsMember}
							selectedIdSet={selectedIdSet}
							permissions={permissions}
							formatters={formatters}
							handlers={handlers}
						/>
					))}
				</div>
			)}
			{hasHiddenDays && (
				<div className="flex justify-center px-4 py-2">
					<Button type="button" variant="ghost" size="default" onClick={onShowMoreDays}>
						<ChevronDown />
						<span>{t('dashboard.timesheets.SHOW_MORE_DAYS', { count: nextStepCount })}</span>
					</Button>
				</div>
			)}
		</div>
	);
}
