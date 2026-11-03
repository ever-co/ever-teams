'use client';

import { type CSSProperties, memo, type MouseEvent, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import type { SheetCellTarget } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	logsSelectionOf,
	type SheetCell,
	type SheetDay,
	type SheetRow,
	type TimesheetFormatters,
	type WeekSheet
} from '@/core/lib/utils/dashboards/timesheets';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { dayLabelOf } from './timesheet-day-label';
import { TaskTitle, taskNumberOf } from './timesheet-log-row';
import { STATUS_LABEL_KEYS, TimesheetStatusChip, TimesheetStatusGlyph } from './timesheet-status';
import {
	dayColumnsSpanOf,
	PINNED_CELL,
	PINNED_TOTALS_CELL,
	SHEET_COLUMN_WIDTHS,
	SHEET_ROW,
	sheetGridStyleOf,
	TOTAL_CELL,
	WEEKEND_CELL
} from './timesheets-sheet-grid';

const MISSING_VALUE = '–';

const CELL_BUTTON =
	'flex h-full min-h-10 w-full items-center justify-center rounded-md text-[13px] tabular-nums text-foreground outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

/** The status column centres the glyph until `2xl`, then starts the chip at the column's edge. */
const STATUS_CELL = 'flex min-w-0 items-center justify-center px-2 2xl:justify-start 2xl:px-3';

const SKELETON_ROWS = [0, 1, 2, 3];

const SKELETON_DAY_COUNT = 7;
const SKELETON_DAY_KEYS = Array.from({ length: SKELETON_DAY_COUNT }, (_, index) => `day-${index}`);

/** Which cells of a skeleton row hold a bar, so the frame reads as a sheet with gaps rather than a solid block. */
const SKELETON_FILLED_CELLS = [
	[true, true, false, true, false, false, false],
	[false, true, true, false, true, false, false],
	[true, false, false, true, true, false, false],
	[false, false, true, false, false, false, false]
];

export type DayLabels = ReadonlyMap<string, string>;

function weekendClassOf(day: SheetDay) {
	if (day.isWeekend) {
		return WEEKEND_CELL;
	}
	return undefined;
}

function dayTotalToneOf(hasTotal: boolean) {
	if (hasTotal) {
		return 'font-medium text-foreground';
	}
	return 'text-muted-foreground';
}

function dayTotalTextOf(seconds: number | undefined) {
	if (!seconds) {
		return MISSING_VALUE;
	}
	return formatDurationShort(seconds);
}

/** What a screen reader hears for a day's total: the duration, or the words for a day without time. */
function spokenTotalOf(seconds: number | undefined, noTimeLabel: string) {
	if (!seconds) {
		return noTimeLabel;
	}
	return formatDurationShort(seconds);
}

function DayHeader({
	day,
	seconds,
	label,
	formatters
}: Readonly<{ day: SheetDay; seconds: number | undefined; label: string; formatters: TimesheetFormatters }>) {
	const hasTotal = Boolean(seconds);
	const totalText = dayTotalTextOf(seconds);
	return (
		<span
			role="columnheader"
			aria-label={label}
			className={cn('flex flex-col items-center justify-center gap-1 px-1 py-2 text-center', weekendClassOf(day))}
		>
			<span
				aria-hidden="true"
				className={cn(
					'text-[13px] font-medium leading-none tabular-nums text-foreground',
					day.isToday && 'font-semibold text-primary-ink'
				)}
			>
				{formatters.dayNumber(day.date)}
			</span>
			<span
				aria-hidden="true"
				className={cn('text-[11px] leading-none text-muted-foreground', day.isToday && 'text-primary-ink')}
			>
				{formatters.weekdayShort(day.date)}
			</span>
			<span aria-hidden="true" className={cn('text-xs leading-none tabular-nums', dayTotalToneOf(hasTotal))}>
				{totalText}
			</span>
		</span>
	);
}

function RowStatus({ status }: Readonly<{ status: ETimesheetStatus | null }>) {
	const t = useTranslations();
	if (!status) {
		return <span className="text-[13px] text-muted-foreground">{MISSING_VALUE}</span>;
	}
	const label = t(STATUS_LABEL_KEYS[status]);
	return (
		<>
			<span className="max-2xl:hidden">
				<TimesheetStatusChip status={status} />
			</span>
			<span title={label} className="inline-flex 2xl:hidden">
				<TimesheetStatusGlyph status={status} className="size-4" />
				<span className="sr-only">{label}</span>
			</span>
		</>
	);
}

function RowProject({ log }: Readonly<{ log: ITimeLog }>) {
	const t = useTranslations();
	const project = log.project;
	if (!project?.name) {
		return <span className="truncate text-xs text-muted-foreground">{t('dashboard.timesheets.NO_PROJECT')}</span>;
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			<EntityTile
				name={project.name}
				color={project.color}
				imageUrl={project.imageUrl}
				className="size-3.5 text-[6px]"
			/>
			<span className="truncate">{project.name}</span>
		</span>
	);
}

function RowTask({ log }: Readonly<{ log: ITimeLog }>) {
	const hasTask = Boolean(log.task);
	const taskNumber = taskNumberOf(log);
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="flex min-w-0 items-center gap-1.5 text-[13px]">
				{hasTask && <TaskPropertyIcon kind="issueType" name={log.task?.issueType} />}
				{taskNumber && (
					<span className="shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
						{taskNumber}
					</span>
				)}
				<TaskTitle log={log} />
			</span>
			<RowProject log={log} />
		</span>
	);
}

function taskNameOf(row: SheetRow, fallback: string) {
	const title = row.sample.task?.title;
	if (title) {
		return title;
	}
	return fallback;
}

function SheetCellView({
	cell,
	day,
	rowKey,
	taskName,
	dayLabel,
	isOpen,
	onOpenCell
}: Readonly<{
	cell: SheetCell | undefined;
	day: SheetDay;
	rowKey: string;
	taskName: string;
	dayLabel: string;
	isOpen: boolean;
	onOpenCell: (target: SheetCellTarget) => void;
}>) {
	const t = useTranslations();
	if (!cell) {
		return (
			<span
				role="cell"
				className={cn(
					'flex items-center justify-center text-[13px] text-muted-foreground',
					weekendClassOf(day)
				)}
			>
				<span aria-hidden="true">{MISSING_VALUE}</span>
				<span className="sr-only">{t('dashboard.timesheets.SHEET.NO_TIME')}</span>
			</span>
		);
	}
	const duration = formatDurationShort(cell.seconds);
	const label = t('dashboard.timesheets.SHEET.CELL_LABEL', {
		task: taskName,
		day: dayLabel,
		duration,
		count: cell.logs.length
	});
	const openEntries = (event: MouseEvent<HTMLButtonElement>) => {
		onOpenCell({ rowKey, dayKey: day.key, anchor: event.currentTarget });
	};
	return (
		<span role="cell" className={cn('flex p-1', weekendClassOf(day))}>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-label={label}
				onClick={openEntries}
				className={cn(CELL_BUTTON, isOpen && 'bg-foreground/[0.03]')}
			>
				{duration}
			</button>
		</span>
	);
}

const SheetRowView = memo(function SheetRowView({
	row,
	days,
	dayLabels,
	gridStyle,
	selectedIdSet,
	openDayKey,
	onSelectLogs,
	onOpenCell
}: Readonly<{
	row: SheetRow;
	days: ReadonlyArray<SheetDay>;
	dayLabels: DayLabels;
	gridStyle: CSSProperties;
	selectedIdSet: ReadonlySet<string>;
	/** The day whose entries are open in the popover, when it is a cell of this row. */
	openDayKey: string | null;
	onSelectLogs: (logIds: string[], shouldSelect: boolean) => void;
	onOpenCell: (target: SheetCellTarget) => void;
}>) {
	const t = useTranslations();
	const taskName = taskNameOf(row, t('dashboard.timesheets.NO_TASK'));
	const selection = logsSelectionOf(row.logs, selectedIdSet);
	const logIds = row.logs.map((log) => log.id);
	const total = formatDurationShort(row.totalSeconds);
	return (
		<div role="row" style={gridStyle} className={cn(SHEET_ROW, 'min-h-13')}>
			<span role="rowheader" className={cn(PINNED_CELL, 'flex min-w-0 items-center gap-3 py-2 pr-2 pl-4')}>
				<Checkbox
					checked={selection.isChecked}
					indeterminate={selection.isPartial}
					onCheckedChange={(checked) => onSelectLogs(logIds, checked)}
					aria-label={t('dashboard.timesheets.SHEET.SELECT_ROW', { task: taskName })}
				/>
				<RowTask log={row.sample} />
			</span>
			{days.map((day) => (
				<SheetCellView
					key={day.key}
					cell={row.cells.get(day.key)}
					day={day}
					rowKey={row.key}
					taskName={taskName}
					dayLabel={dayLabels.get(day.key) ?? ''}
					isOpen={openDayKey === day.key}
					onOpenCell={onOpenCell}
				/>
			))}
			<span role="cell" className={cn(TOTAL_CELL, 'text-[13px] font-medium tabular-nums text-foreground')}>
				{total}
			</span>
			<span role="cell" className={STATUS_CELL}>
				<RowStatus status={row.status} />
			</span>
		</div>
	);
});

function openDayKeyOf(openCell: SheetCellTarget | null, rowKey: string) {
	if (!openCell) {
		return null;
	}
	if (openCell.rowKey !== rowKey) {
		return null;
	}
	return openCell.dayKey;
}

function dayLabelsOf(days: ReadonlyArray<SheetDay>, label: (day: SheetDay) => string): Map<string, string> {
	const labels = new Map<string, string>();
	for (const day of days) {
		const text = label(day);
		labels.set(day.key, text);
	}
	return labels;
}

/**
 * The week sheet of one member: a row per task and project pair, a column per day of the period (number over
 * weekday, the day's total under it, today in ink, weekends shaded), the time in each cell, the row's total and
 * the status of its logs at its end, and the period total in a 3D pill on the closing row. A cell opens its
 * entries; the task column stays pinned while a long period scrolls sideways.
 */
export function TimesheetsWeekSheet({
	days,
	sheet,
	memberName,
	formatters,
	selectedIdSet,
	openCell,
	isCellOpen,
	onSelectLogs,
	onOpenCell
}: Readonly<{
	days: ReadonlyArray<SheetDay>;
	sheet: WeekSheet;
	memberName: string;
	formatters: TimesheetFormatters;
	selectedIdSet: ReadonlySet<string>;
	openCell: SheetCellTarget | null;
	isCellOpen: boolean;
	onSelectLogs: (logIds: string[], shouldSelect: boolean) => void;
	onOpenCell: (target: SheetCellTarget) => void;
}>) {
	const t = useTranslations();
	const dayCount = days.length;
	const gridStyle = useMemo(() => sheetGridStyleOf(dayCount), [dayCount]);
	const dayLabels = useMemo(() => {
		const labelOf = (day: SheetDay) => dayLabelOf(day.date, t, formatters);
		return dayLabelsOf(days, labelOf);
	}, [days, formatters, t]);
	const sheetLogs = useMemo(() => sheet.rows.flatMap((row) => row.logs), [sheet.rows]);
	const sheetLogIds = useMemo(() => sheetLogs.map((log) => log.id), [sheetLogs]);
	const selection = logsSelectionOf(sheetLogs, selectedIdSet);
	const hasRows = sheet.rows.length > 0;
	let shownOpenCell: SheetCellTarget | null = null;
	if (isCellOpen) {
		shownOpenCell = openCell;
	}
	const grandTotal = formatDurationShort(sheet.totalSeconds);
	const noTimeLabel = t('dashboard.timesheets.SHEET.NO_TIME');

	return (
		<div className={cn('overflow-x-auto overscroll-x-contain', SHEET_COLUMN_WIDTHS)}>
			<div
				role="table"
				aria-label={t('dashboard.timesheets.SHEET.TABLE_LABEL', { name: memberName })}
				className="w-max min-w-full"
			>
				<div
					role="row"
					style={gridStyle}
					className={cn(SHEET_ROW, 'min-h-15 hairline-b border-border text-xs text-muted-foreground')}
				>
					<span role="columnheader" className={cn(PINNED_CELL, 'flex items-center gap-3 pr-2 pl-4')}>
						{hasRows && (
							<Checkbox
								checked={selection.isChecked}
								indeterminate={selection.isPartial}
								onCheckedChange={(checked) => onSelectLogs(sheetLogIds, checked)}
								aria-label={t('dashboard.timesheets.SHEET.SELECT_SHEET', { name: memberName })}
							/>
						)}
						<span className="font-medium">{t('dashboard.timesheets.COLUMNS.TASK')}</span>
					</span>
					{days.map((day) => {
						const seconds = sheet.dayTotals.get(day.key);
						const spokenTotal = spokenTotalOf(seconds, noTimeLabel);
						const dayLabel = dayLabels.get(day.key) ?? '';
						const label = t('dashboard.timesheets.SHEET.DAY_HEADER', { day: dayLabel, total: spokenTotal });
						return (
							<DayHeader
								key={day.key}
								day={day}
								seconds={seconds}
								label={label}
								formatters={formatters}
							/>
						);
					})}
					<span role="columnheader" className={cn(TOTAL_CELL, 'font-medium')}>
						{t('common.TOTAL')}
					</span>
					<span role="columnheader" className={cn(STATUS_CELL, 'font-medium')}>
						<span className="max-2xl:sr-only">{t('dashboard.timesheets.COLUMNS.STATUS')}</span>
					</span>
				</div>
				{hasRows && (
					<div role="rowgroup" className="hairline-divide-y divide-border">
						{sheet.rows.map((row) => (
							<SheetRowView
								key={row.key}
								row={row}
								days={days}
								dayLabels={dayLabels}
								gridStyle={gridStyle}
								selectedIdSet={selectedIdSet}
								openDayKey={openDayKeyOf(shownOpenCell, row.key)}
								onSelectLogs={onSelectLogs}
								onOpenCell={onOpenCell}
							/>
						))}
					</div>
				)}
				{hasRows && (
					<div role="row" style={gridStyle} className={cn(SHEET_ROW, 'min-h-11 hairline-t border-border')}>
						<span
							role="rowheader"
							className={cn(PINNED_TOTALS_CELL, 'flex items-center pl-4 text-[13px] font-medium')}
						>
							{t('dashboard.timesheets.SHEET.PERIOD_TOTAL')}
						</span>
						<span aria-hidden="true" style={dayColumnsSpanOf(dayCount)} />
						<span role="cell" className={TOTAL_CELL}>
							<span className="chip-3d inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold tabular-nums [--chip:hsl(var(--primary))]">
								{grandTotal}
							</span>
						</span>
						<span aria-hidden="true" />
					</div>
				)}
			</div>
		</div>
	);
}

function SkeletonRow({ cells, gridStyle }: Readonly<{ cells: ReadonlyArray<boolean>; gridStyle: CSSProperties }>) {
	return (
		<div style={gridStyle} className={cn(SHEET_ROW, 'min-h-13')}>
			<span className={cn(PINNED_CELL, 'flex items-center gap-3 pr-2 pl-4')}>
				<span className="size-4 shrink-0 rounded-[4px] bg-foreground/[0.06]" />
				<span className="flex flex-1 flex-col gap-1.5">
					<span className={cn('h-2.5 w-3/4', SKELETON_BAR)} />
					<span className={cn('h-2 w-1/2', SKELETON_BAR)} />
				</span>
			</span>
			{SKELETON_DAY_KEYS.map((dayKey, index) => {
				const isFilled = cells[index];
				return (
					<span key={dayKey} className="flex items-center justify-center">
						{isFilled && <span className={cn('h-2.5 w-10', SKELETON_BAR)} />}
					</span>
				);
			})}
			<span className={TOTAL_CELL}>
				<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
			</span>
			<span className={STATUS_CELL}>
				<span className="h-5 w-16 rounded-md bg-foreground/[0.05] max-2xl:w-4" />
			</span>
		</div>
	);
}

/** The sheet while the first logs load: a week of columns and task rows at their real height. */
export function TimesheetsWeekSheetSkeleton() {
	const gridStyle = sheetGridStyleOf(SKELETON_DAY_COUNT);
	const headerCells = Array.from({ length: SKELETON_DAY_COUNT }, (_, index) => index);
	return (
		<div aria-hidden="true" className={cn('overflow-hidden', SHEET_COLUMN_WIDTHS)}>
			<div className="w-max min-w-full">
				<div style={gridStyle} className={cn(SHEET_ROW, 'min-h-15 hairline-b border-border')}>
					<span className={cn(PINNED_CELL, 'flex items-center pl-4')}>
						<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
					</span>
					{headerCells.map((index) => (
						<span key={index} className="flex flex-col items-center justify-center gap-1.5">
							<span className={cn('h-2.5 w-4', SKELETON_BAR)} />
							<span className={cn('h-2 w-6', SKELETON_BAR)} />
						</span>
					))}
					<span className={TOTAL_CELL}>
						<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					</span>
					<span />
				</div>
				<div className="hairline-divide-y divide-border">
					{SKELETON_ROWS.map((index) => (
						<SkeletonRow key={index} cells={SKELETON_FILLED_CELLS[index] ?? []} gridStyle={gridStyle} />
					))}
				</div>
			</div>
		</div>
	);
}
