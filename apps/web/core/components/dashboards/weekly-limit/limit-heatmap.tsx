'use client';

import {
	type CSSProperties,
	type FocusEvent,
	type KeyboardEvent,
	memo,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState
} from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { Tooltip, TooltipBubbleArrowGlyph, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { TOOLTIP_ARROW_FILL, TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { LimitMeter } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { InformationCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, type LimitVerdict } from '@/core/lib/utils/dashboard-figures';
import { periodOfPreset } from '@/core/lib/utils/dashboard-period';
import { scrollBehavior } from '@/core/lib/utils/motion';
import {
	clockHoursOf,
	LIMIT_WEEK_START,
	limitColumnsOf,
	limitHeatStepOf,
	limitMonthSegmentsOf,
	limitShareLabelOf,
	overrunOf,
	periodEndOf,
	periodLabelOf,
	weekendDaysOf,
	DEFAULT_WEEKEND_DAYS,
	type LimitColumn,
	type LimitDuration,
	type LimitEntry,
	type LimitMatrixRow,
	type LimitMember,
	type LimitTotals
} from '@/core/lib/utils/dashboards/weekly-limit';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { MemberFace, UsedValue, VerdictText } from './limit-cells';
import {
	HEAT_CELL_BASE,
	HEAT_CELL_SIZES,
	HEAT_FRAME_BOUNDS,
	HEAT_FRAME_VARS,
	HEAT_FUTURE,
	HEAT_ROW,
	HEAT_SLOT,
	HEAT_SLOT_VARS,
	HEAT_STEP_CLASSES,
	HEAT_STICKY_END,
	HEAT_STICKY_START,
	HEAT_WEEKEND,
	heatTemplateOf,
	LEGEND_STEPS,
	LEGEND_SWATCH,
	type LegendStep
} from './limit-heatmap-grid';

type Translate = ReturnType<typeof useTranslations>;

const TITLE_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.HEATMAP_TITLE_DAYS',
	week: 'dashboard.weeklyLimit.HEATMAP_TITLE_WEEKS'
};

const CURRENT_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'common.TODAY',
	week: 'common.THIS_WEEK'
};

const LEGEND_STEP_KEYS: Record<LegendStep, DottedLanguageObjectStringPaths> = {
	low: 'dashboard.weeklyLimit.LEGEND_STEP_LOW',
	medium: 'dashboard.weeklyLimit.LEGEND_STEP_MEDIUM',
	high: 'dashboard.weeklyLimit.LEGEND_STEP_HIGH',
	full: 'dashboard.weeklyLimit.LEGEND_STEP_FULL'
};

const USED_TONES: Record<LimitVerdict, string> = {
	within: 'text-foreground',
	near: 'text-warning-foreground',
	over: 'text-destructive-ink'
};

const VERDICT_KEYS: Record<LimitVerdict, DottedLanguageObjectStringPaths> = {
	within: 'dashboard.weeklyLimit.VERDICT_WITHIN',
	near: 'dashboard.weeklyLimit.VERDICT_NEAR',
	over: 'dashboard.weeklyLimit.VERDICT_OVER'
};

const MISSING_FIGURE = '–';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterOf(locale: string, name: string, options: Intl.DateTimeFormatOptions) {
	const cacheKey = `${locale}:${name}`;
	const cached = formatters.get(cacheKey);
	if (cached) {
		return cached;
	}
	const formatter = new Intl.DateTimeFormat(locale, options);
	formatters.set(cacheKey, formatter);
	return formatter;
}

interface ColumnHeading {
	top: string;
	bottom: string;
	label: string;
}

function dayHeadingOf(column: LimitColumn, locale: string): ColumnHeading {
	const weekdayFormat = formatterOf(locale, 'weekday', { weekday: 'short' });
	const dayFormat = formatterOf(locale, 'day', { day: 'numeric' });
	const weekday = weekdayFormat.format(column.start);
	const day = dayFormat.format(column.start);
	const label = periodLabelOf(column.start, 'day', locale);
	return { top: weekday, bottom: day, label };
}

function weekHeadingOf(column: LimitColumn, locale: string): ColumnHeading {
	const dateFormat = formatterOf(locale, 'monthDay', { month: 'short', day: 'numeric' });
	const weekEnd = periodEndOf(column.start, 'week');
	const top = dateFormat.format(column.start);
	const bottom = dateFormat.format(weekEnd);
	const label = periodLabelOf(column.start, 'week', locale);
	return { top, bottom, label };
}

function headingOf(column: LimitColumn, duration: LimitDuration, locale: string) {
	if (duration === 'week') {
		return weekHeadingOf(column, locale);
	}
	return dayHeadingOf(column, locale);
}

interface CellReading {
	figures: string;
	shareText: string | null;
	verdictText: string | null;
	verdict: LimitVerdict | null;
	sentence: string;
}

function hasTrackedTime(entry: LimitEntry | undefined): entry is LimitEntry {
	if (!entry) {
		return false;
	}
	return entry.used > 0;
}

function figuresOf(entry: LimitEntry | undefined, column: LimitColumn, t: Translate) {
	if (!hasTrackedTime(entry)) {
		if (column.isFuture) {
			return t('dashboard.weeklyLimit.CELL_UPCOMING');
		}
		return t('dashboard.weeklyLimit.CELL_NO_TIME');
	}
	const used = formatDurationShort(entry.used);
	if (!entry.hasLimit) {
		return t('dashboard.weeklyLimit.CELL_TRACKED_NO_LIMIT', { used });
	}
	const limit = formatHoursLabel(entry.limit);
	return t('dashboard.weeklyLimit.CELL_USED_OF', { used, limit });
}

function flaggedVerdictOf(entry: LimitEntry | undefined): LimitVerdict | null {
	if (!entry) {
		return null;
	}
	const isFlagged = entry.verdict !== 'within';
	const isMeasured = entry.hasLimit;
	if (isFlagged && isMeasured) {
		return entry.verdict;
	}
	return null;
}

function verdictTextOf(entry: LimitEntry | undefined, verdict: LimitVerdict | null, t: Translate) {
	if (!entry) {
		return null;
	}
	if (verdict === 'over') {
		const overrun = formatDurationShort(overrunOf(entry.remaining));
		return t('dashboard.weeklyLimit.REMAINING_OVER', { duration: overrun });
	}
	if (verdict === 'near') {
		return t('dashboard.weeklyLimit.VERDICT_NEAR');
	}
	return null;
}

function shareTextOf(entry: LimitEntry | undefined) {
	if (!hasTrackedTime(entry)) {
		return null;
	}
	if (!entry.hasLimit) {
		return null;
	}
	return limitShareLabelOf(entry.share, entry.verdict);
}

function cellReadingOf(entry: LimitEntry | undefined, column: LimitColumn, label: string, t: Translate): CellReading {
	const figures = figuresOf(entry, column, t);
	const shareText = shareTextOf(entry);
	const verdict = flaggedVerdictOf(entry);
	const verdictText = verdictTextOf(entry, verdict, t);
	const parts = [label, figures];
	if (shareText) {
		parts.push(shareText);
	}
	if (verdictText) {
		parts.push(verdictText);
	}
	const sentence = parts.join(' · ');
	return { figures, shareText, verdictText, verdict, sentence };
}

function cellFigureOf(entry: LimitEntry | undefined) {
	if (!hasTrackedTime(entry)) {
		return '';
	}
	return clockHoursOf(entry.used);
}

function cellClassOf(entry: LimitEntry | undefined, column: LimitColumn) {
	const step = limitHeatStepOf(entry);
	const isEmptyFuture = step === 'empty' && column.isFuture;
	if (isEmptyFuture) {
		return HEAT_FUTURE;
	}
	return HEAT_STEP_CLASSES[step];
}

interface CellPosition {
	row: number;
	column: number;
}

function cellElementOf(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof Element)) {
		return null;
	}
	return target.closest<HTMLElement>('[data-heat-cell]');
}

function positionOf(cell: HTMLElement): CellPosition | null {
	const row = Number(cell.dataset.row);
	const column = Number(cell.dataset.column);
	const isValid = Number.isInteger(row) && Number.isInteger(column);
	if (!isValid) {
		return null;
	}
	return { row, column };
}

function clamp(value: number, max: number) {
	const atLeastZero = Math.max(value, 0);
	return Math.min(atLeastZero, max);
}

function horizontalStepOf(key: string, isRtl: boolean) {
	const forward = 1;
	const backward = -1;
	if (key === 'ArrowRight') {
		if (isRtl) {
			return backward;
		}
		return forward;
	}
	if (key === 'ArrowLeft') {
		if (isRtl) {
			return forward;
		}
		return backward;
	}
	return 0;
}

function nextPositionOf(
	position: CellPosition,
	key: string,
	isRtl: boolean,
	rowCount: number,
	columnCount: number
): CellPosition | null {
	const lastRow = rowCount - 1;
	const lastColumn = columnCount - 1;
	const horizontalStep = horizontalStepOf(key, isRtl);
	if (horizontalStep !== 0) {
		const nextColumn = position.column + horizontalStep;
		return { row: position.row, column: clamp(nextColumn, lastColumn) };
	}
	if (key === 'ArrowDown') {
		const nextRow = position.row + 1;
		return { row: clamp(nextRow, lastRow), column: position.column };
	}
	if (key === 'ArrowUp') {
		const previousRow = position.row - 1;
		return { row: clamp(previousRow, lastRow), column: position.column };
	}
	if (key === 'Home') {
		return { row: position.row, column: 0 };
	}
	if (key === 'End') {
		return { row: position.row, column: lastColumn };
	}
	return null;
}

function cellSelectorOf(position: CellPosition) {
	return `[data-heat-cell][data-row="${position.row}"][data-column="${position.column}"]`;
}

type BubbleAlignment = 'start' | 'centre' | 'end';

interface BubbleAnchor {
	position: CellPosition;
	left: number;
	top: number;
	alignment: BubbleAlignment;
}

const EDGE_SHARE = 0.15;

function alignmentOf(left: number, width: number): BubbleAlignment {
	const share = left / Math.max(width, 1);
	if (share < EDGE_SHARE) {
		return 'start';
	}
	if (share > 1 - EDGE_SHARE) {
		return 'end';
	}
	return 'centre';
}

/** The slot pads its square by 2px, so the bubble's arrow touches the square rather than the slot. */
const SLOT_PADDING = 2;

function anchorOf(cell: HTMLElement, frame: HTMLElement, position: CellPosition): BubbleAnchor {
	const cellBox = cell.getBoundingClientRect();
	const frameBox = frame.getBoundingClientRect();
	const left = cellBox.left - frameBox.left + cellBox.width / 2;
	const top = cellBox.top - frameBox.top + SLOT_PADDING;
	const alignment = alignmentOf(left, frameBox.width);
	return { position, left, top, alignment };
}

const BUBBLE_SHIFTS: Record<BubbleAlignment, string> = {
	start: '-translate-x-4',
	centre: '-translate-x-1/2',
	end: '-translate-x-[calc(100%-1rem)]'
};

const ARROW_PLACES: Record<BubbleAlignment, string> = {
	start: 'left-4 -translate-x-1/2',
	centre: 'left-1/2 -translate-x-1/2',
	end: 'right-4 translate-x-1/2'
};

const BUBBLE_VERDICT_TONES: Record<LimitVerdict, string> = {
	within: 'text-muted-foreground',
	near: 'text-warning-foreground',
	over: 'text-destructive-ink'
};

function verdictToneOf(verdict: LimitVerdict | null) {
	if (!verdict) {
		return BUBBLE_VERDICT_TONES.within;
	}
	return BUBBLE_VERDICT_TONES[verdict];
}

function CellBubble({
	anchor,
	label,
	reading
}: Readonly<{ anchor: BubbleAnchor; label: string; reading: CellReading }>) {
	const style: CSSProperties = { left: anchor.left, top: anchor.top };
	return (
		<div
			className={cn(
				'pointer-events-none absolute z-10 -translate-y-full pb-1.5',
				BUBBLE_SHIFTS[anchor.alignment]
			)}
			style={style}
		>
			<div className={cn(TOOLTIP_SURFACE, 'relative max-w-none whitespace-nowrap px-2.5 py-1.5 tabular-nums')}>
				<span className="text-foreground">{label}</span>
				<span className="text-muted-foreground">{` · ${reading.figures}`}</span>
				{reading.shareText && <span className="text-foreground">{` · ${reading.shareText}`}</span>}
				{reading.verdictText && (
					<span className={verdictToneOf(reading.verdict)}>{` · ${reading.verdictText}`}</span>
				)}
				<span
					aria-hidden="true"
					className={cn(
						'absolute -bottom-1.5 block h-1.5 w-3 rotate-180',
						TOOLTIP_ARROW_FILL,
						ARROW_PLACES[anchor.alignment]
					)}
				>
					<TooltipBubbleArrowGlyph />
				</span>
			</div>
		</div>
	);
}

function ColumnHeader({
	column,
	heading,
	duration
}: Readonly<{ column: LimitColumn; heading: ColumnHeading; duration: LimitDuration }>) {
	const t = useTranslations();
	const currentTone = column.isCurrent && 'text-primary-ink';
	return (
		<div
			role="columnheader"
			className={cn(
				'flex min-w-0 flex-col items-center justify-center py-1.5 leading-tight',
				column.isWeekend && HEAT_WEEKEND
			)}
		>
			<span className={cn('truncate text-[11px] text-muted-foreground', currentTone)}>{heading.top}</span>
			<span className={cn('truncate text-xs font-medium tabular-nums text-foreground', currentTone)}>
				{heading.bottom}
			</span>
			<span className="sr-only">{heading.label}</span>
			{column.isCurrent && <span className="sr-only">{t(CURRENT_KEYS[duration])}</span>}
		</div>
	);
}

function MonthRow({
	columns,
	template,
	locale
}: Readonly<{ columns: ReadonlyArray<LimitColumn>; template: CSSProperties; locale: string }>) {
	const segments = useMemo(() => limitMonthSegmentsOf(columns), [columns]);
	const hasSeveralMonths = segments.length > 1;
	if (!hasSeveralMonths) {
		return null;
	}
	const monthFormat = formatterOf(locale, 'month', { month: 'short' });
	return (
		<div aria-hidden="true" className="grid min-h-6" style={template}>
			<span className={HEAT_STICKY_START} />
			{segments.map((segment) => {
				const firstTrack = segment.firstIndex + 2;
				const style: CSSProperties = { gridColumn: `${firstTrack} / span ${segment.length}` };
				return (
					<span
						key={segment.key}
						className="truncate ps-1.5 pt-1.5 text-[11px] font-medium text-muted-foreground"
						style={style}
					>
						{monthFormat.format(segment.start)}
					</span>
				);
			})}
		</div>
	);
}

function LimitHint() {
	const t = useTranslations();
	return (
		<Tooltip>
			<TooltipTrigger
				delay={400}
				render={
					<button
						type="button"
						aria-label={t('dashboard.weeklyLimit.LIMIT_HINT_LABEL')}
						className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
				}
			>
				<InformationCircle aria-hidden="true" className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent className="max-w-72">{t('dashboard.weeklyLimit.COLUMN_USED_HINT')}</TooltipContent>
		</Tooltip>
	);
}

function HeaderRow({
	columns,
	headings,
	duration,
	template
}: Readonly<{
	columns: ReadonlyArray<LimitColumn>;
	headings: ReadonlyArray<ColumnHeading>;
	duration: LimitDuration;
	template: CSSProperties;
}>) {
	const t = useTranslations();
	return (
		<div role="row" className="grid min-h-11 hairline-b border-border" style={template}>
			<div
				role="columnheader"
				className={cn(
					HEAT_STICKY_START,
					'flex items-end ps-4 pe-2 pb-2 text-xs font-medium text-muted-foreground'
				)}
			>
				{t('common.MEMBER')}
			</div>
			{columns.map((column, index) => (
				<ColumnHeader key={column.key} column={column} heading={headings[index]} duration={duration} />
			))}
			<div
				role="columnheader"
				className={cn(HEAT_STICKY_END, 'flex items-end px-4 pb-2 text-xs font-medium text-muted-foreground')}
			>
				{t('dashboard.weeklyLimit.COLUMN_USED')}
			</div>
		</div>
	);
}

function totalLimitTextOf(totals: LimitTotals) {
	if (!totals.hasLimit) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(totals.limit);
}

function CompactTotal({ totals }: Readonly<{ totals: LimitTotals }>) {
	const t = useTranslations();
	const usedTone = USED_TONES[totals.verdict];
	const verdictLabel = verdictLabelOf(totals, t);
	return (
		<span className="block truncate text-xs tabular-nums lg:hidden">
			<span className={usedTone}>{formatDurationShort(totals.used)}</span>
			<span className="text-muted-foreground">{` / ${totalLimitTextOf(totals)}`}</span>
			<span className="sr-only">{` · ${verdictLabel}`}</span>
		</span>
	);
}

function verdictLabelOf(totals: LimitTotals, t: Translate) {
	if (!totals.hasLimit) {
		return t('dashboard.weeklyLimit.NO_LIMIT');
	}
	return t(VERDICT_KEYS[totals.verdict]);
}

function MemberRowHeader({
	member,
	isStandardLimit,
	totals,
	isHighlighted
}: Readonly<{ member: LimitMember; isStandardLimit: boolean; totals: LimitTotals; isHighlighted: boolean }>) {
	const t = useTranslations();
	return (
		<div
			role="rowheader"
			className={cn(
				HEAT_STICKY_START,
				'relative flex min-w-0 items-center gap-2 ps-4 pe-2',
				isHighlighted &&
					'before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-primary'
			)}
		>
			<MemberFace name={member.name} imageUrl={member.imageUrl} size="md" />
			<span className="flex min-w-0 flex-col">
				<span
					className={cn(
						'truncate text-[13px] text-foreground',
						isHighlighted && 'font-medium text-primary-ink'
					)}
				>
					{member.name}
				</span>
				<CompactTotal totals={totals} />
				{isStandardLimit && (
					<span className="truncate text-xs text-muted-foreground max-lg:hidden">
						{t('dashboard.weeklyLimit.STANDARD_LIMIT')}
					</span>
				)}
			</span>
		</div>
	);
}

function RowTotal({ totals }: Readonly<{ totals: LimitTotals }>) {
	return (
		<div role="gridcell" className={cn(HEAT_STICKY_END, 'flex min-w-0 flex-col justify-center gap-1 px-4')}>
			<span className="flex min-w-0 items-baseline justify-between gap-2">
				<UsedValue figure={totals} className="text-left" />
				<VerdictText figure={totals} className="shrink-0 text-xs" />
			</span>
			{totals.hasLimit && <LimitMeter used={totals.used} limit={totals.limit} className="h-2" />}
		</div>
	);
}

const HeatRow = memo(function HeatRow({
	row,
	rowIndex,
	columns,
	headings,
	duration,
	template,
	rovingColumn,
	isHighlighted
}: Readonly<{
	row: LimitMatrixRow;
	rowIndex: number;
	columns: ReadonlyArray<LimitColumn>;
	headings: ReadonlyArray<ColumnHeading>;
	duration: LimitDuration;
	template: CSSProperties;
	/** The column that takes the Tab stop in this row, or -1 when the stop is in another row. */
	rovingColumn: number;
	isHighlighted: boolean;
}>) {
	const t = useTranslations();
	return (
		<div
			role="row"
			data-member-row={row.key}
			className={cn(HEAT_ROW, isHighlighted && 'bg-foreground/[0.03]')}
			style={template}
		>
			<MemberRowHeader
				member={row.member}
				isStandardLimit={row.isStandardLimit}
				totals={row.totals}
				isHighlighted={isHighlighted}
			/>
			{columns.map((column, columnIndex) => {
				const entry = row.entriesByColumn.get(column.key);
				const heading = headings[columnIndex];
				const reading = cellReadingOf(entry, column, heading.label, t);
				const tabIndex = tabIndexOf(rovingColumn === columnIndex);
				return (
					<div
						key={column.key}
						role="gridcell"
						tabIndex={tabIndex}
						aria-label={reading.sentence}
						data-heat-cell=""
						data-row={rowIndex}
						data-column={columnIndex}
						className={cn('group outline-none', HEAT_SLOT, column.isWeekend && HEAT_WEEKEND)}
					>
						<span
							aria-hidden="true"
							className={cn(HEAT_CELL_BASE, HEAT_CELL_SIZES[duration], cellClassOf(entry, column))}
						>
							{cellFigureOf(entry)}
						</span>
					</div>
				);
			})}
			<RowTotal totals={row.totals} />
		</div>
	);
});

function tabIndexOf(isRovingStop: boolean) {
	if (isRovingStop) {
		return 0;
	}
	return -1;
}

function rovingColumnOf(stop: CellPosition, rowIndex: number) {
	if (stop.row === rowIndex) {
		return stop.column;
	}
	return -1;
}

function initialColumnOf(columns: ReadonlyArray<LimitColumn>) {
	const currentIndex = columns.findIndex((column) => column.isCurrent);
	if (currentIndex >= 0) {
		return currentIndex;
	}
	return 0;
}

function HeatLegend() {
	const t = useTranslations();
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
			<span className="flex items-center gap-1">
				<span>{t('dashboard.weeklyLimit.LEGEND_LABEL')}</span>
				<LimitHint />
			</span>
			<span className="flex items-center gap-1.5">
				<span>{t('dashboard.weeklyLimit.LEGEND_LESS')}</span>
				<ul className="flex items-center gap-0.5">
					{LEGEND_STEPS.map((step) => {
						const stepLabel = t(LEGEND_STEP_KEYS[step]);
						return (
							<li key={step} title={stepLabel} className={cn(LEGEND_SWATCH, HEAT_STEP_CLASSES[step])}>
								<span className="sr-only">{stepLabel}</span>
							</li>
						);
					})}
				</ul>
				<span>{t('dashboard.weeklyLimit.LEGEND_MORE')}</span>
			</span>
			<span aria-hidden="true">·</span>
			<span className="flex items-center gap-1.5">
				<span aria-hidden="true" className={cn(LEGEND_SWATCH, HEAT_STEP_CLASSES.over)} />
				<span>{t('dashboard.weeklyLimit.VERDICT_OVER')}</span>
			</span>
			<span className="flex items-center gap-1.5">
				<span aria-hidden="true" className={cn(LEGEND_SWATCH, HEAT_STEP_CLASSES.empty)} />
				<span>{t('dashboard.weeklyLimit.LEGEND_NO_TIME')}</span>
			</span>
		</div>
	);
}

function MembersWithoutTimeLine({ members }: Readonly<{ members: ReadonlyArray<LimitMember> }>) {
	const t = useTranslations();
	const locale = useLocale();
	const names = useMemo(() => {
		const list = new Intl.ListFormat(locale, { type: 'conjunction' });
		const memberNames = members.map((member) => member.name);
		return list.format(memberNames);
	}, [locale, members]);
	const hasMembers = members.length > 0;
	if (!hasMembers) {
		return null;
	}
	const sentence = t('dashboard.weeklyLimit.MEMBERS_WITHOUT_TIME_NAMES', { count: members.length, names });
	return (
		<p className="line-clamp-2 text-xs text-muted-foreground" title={sentence}>
			{sentence}
		</p>
	);
}

function HeatFooter({ membersWithoutTime }: Readonly<{ membersWithoutTime: ReadonlyArray<LimitMember> }>) {
	return (
		<div className="flex flex-col gap-1.5 px-4 pt-4 pb-3 text-xs text-muted-foreground">
			<HeatLegend />
			<MembersWithoutTimeLine members={membersWithoutTime} />
		</div>
	);
}

function useColumns(period: Period, duration: LimitDuration) {
	const locale = useLocale();
	const weekendDays = useMemo(() => weekendDaysOf(locale), [locale]);
	const columns = useMemo(() => limitColumnsOf(period, duration, weekendDays), [duration, period, weekendDays]);
	const headings = useMemo(
		() => columns.map((column) => headingOf(column, duration, locale)),
		[columns, duration, locale]
	);
	const template = useMemo(() => heatTemplateOf(columns.length), [columns.length]);
	return { locale, columns, headings, template };
}

export interface LimitHeatmapProps {
	rows: ReadonlyArray<LimitMatrixRow>;
	period: Period;
	duration: LimitDuration;
	membersWithoutTime: ReadonlyArray<LimitMember>;
	highlightedKey: string | null;
	isUpdating: boolean;
	empty: ReactNode;
}

function isSamePosition(first: CellPosition, second: CellPosition) {
	const isSameRow = first.row === second.row;
	const isSameColumn = first.column === second.column;
	return isSameRow && isSameColumn;
}

/** Moving between a slot and its square fires again for the same cell: the matrix keeps its state then. */
function keepSameAnchor(current: BubbleAnchor | null, next: BubbleAnchor | null) {
	if (!current) {
		return next;
	}
	if (!next) {
		return next;
	}
	if (isSamePosition(current.position, next.position)) {
		return current;
	}
	return next;
}

interface ShownBubble {
	anchor: BubbleAnchor;
	label: string;
	reading: CellReading;
}

function shownBubbleOf(
	anchor: BubbleAnchor | null,
	rows: ReadonlyArray<LimitMatrixRow>,
	columns: ReadonlyArray<LimitColumn>,
	headings: ReadonlyArray<ColumnHeading>,
	t: Translate
): ShownBubble | null {
	if (!anchor) {
		return null;
	}
	const row = rows[anchor.position.row];
	const column = columns[anchor.position.column];
	const heading = headings[anchor.position.column];
	if (!row) {
		return null;
	}
	if (!column) {
		return null;
	}
	if (!heading) {
		return null;
	}
	const entry = row.entriesByColumn.get(column.key);
	const reading = cellReadingOf(entry, column, heading.label, t);
	return { anchor, label: heading.label, reading };
}

function focusedCellIn(grid: HTMLElement | null) {
	const activeCell = cellElementOf(document.activeElement);
	if (!activeCell) {
		return null;
	}
	const isInGrid = Boolean(grid?.contains(activeCell));
	if (!isInGrid) {
		return null;
	}
	return activeCell;
}

/**
 * Members by days (or weeks): each square holds the hours and takes one of four brand steps by the share of the
 * member's limit, a destructive tint past it. One bubble serves the whole matrix, so hovering never renders a row;
 * the arrow keys walk the squares with a single Tab stop.
 */
export function LimitHeatmap({
	rows,
	period,
	duration,
	membersWithoutTime,
	highlightedKey,
	isUpdating,
	empty
}: Readonly<LimitHeatmapProps>) {
	const t = useTranslations();
	const keysHintId = useId();
	const frameRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const { locale, columns, headings, template } = useColumns(period, duration);
	const [hovered, setHovered] = useState<BubbleAnchor | null>(null);
	const [focused, setFocused] = useState<BubbleAnchor | null>(null);
	const [stop, setStop] = useState<CellPosition>(() => ({ row: 0, column: initialColumnOf(columns) }));

	const rowCount = rows.length;
	const columnCount = columns.length;
	const hasRows = rowCount > 0;
	const stopRow = clamp(stop.row, rowCount - 1);
	const stopColumn = clamp(stop.column, columnCount - 1);
	const safeStop: CellPosition = { row: stopRow, column: stopColumn };
	const title = t(TITLE_KEYS[duration]);
	const meta = t('dashboard.weeklyLimit.MEMBERS_COUNT', { count: rowCount });
	const shownAnchor = hovered ?? focused;

	const anchorFromCell = useCallback((cell: HTMLElement) => {
		const frame = frameRef.current;
		const position = positionOf(cell);
		if (!frame || !position) {
			return null;
		}
		return anchorOf(cell, frame, position);
	}, []);

	const handlePointerOver = useCallback(
		(event: { target: EventTarget | null }) => {
			const cell = cellElementOf(event.target);
			if (!cell) {
				return;
			}
			const anchor = anchorFromCell(cell);
			setHovered((current) => keepSameAnchor(current, anchor));
		},
		[anchorFromCell]
	);

	const clearHovered = useCallback(() => setHovered(null), []);

	/** Focusing a square at the edge scrolls the matrix, so the focused bubble follows its square. */
	const handleScroll = useCallback(() => {
		setHovered(null);
		const cell = focusedCellIn(gridRef.current);
		if (!cell) {
			setFocused(null);
			return;
		}
		setFocused(anchorFromCell(cell));
	}, [anchorFromCell]);

	const handleFocus = useCallback(
		(event: FocusEvent<HTMLDivElement>) => {
			const cell = cellElementOf(event.target);
			if (!cell) {
				return;
			}
			const anchor = anchorFromCell(cell);
			setFocused(anchor);
			if (anchor) {
				setStop(anchor.position);
			}
		},
		[anchorFromCell]
	);

	const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
		const grid = gridRef.current;
		const nextTarget = event.relatedTarget;
		const isNode = nextTarget instanceof Node;
		const staysInGrid = isNode && Boolean(grid?.contains(nextTarget));
		if (!staysInGrid) {
			setFocused(null);
		}
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const cell = cellElementOf(event.target);
			const grid = gridRef.current;
			if (!cell || !grid) {
				return;
			}
			const position = positionOf(cell);
			if (!position) {
				return;
			}
			const isRtl = getComputedStyle(grid).direction === 'rtl';
			const next = nextPositionOf(position, event.key, isRtl, rowCount, columnCount);
			if (!next) {
				return;
			}
			event.preventDefault();
			const target = grid.querySelector<HTMLElement>(cellSelectorOf(next));
			target?.focus();
		},
		[columnCount, rowCount]
	);

	useEffect(() => {
		if (!highlightedKey) {
			return;
		}
		const grid = gridRef.current;
		const selector = `[data-member-row="${CSS.escape(highlightedKey)}"]`;
		const row = grid?.querySelector<HTMLElement>(selector);
		row?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollBehavior() });
	}, [highlightedKey]);

	const bubble = useMemo(
		() => shownBubbleOf(shownAnchor, rows, columns, headings, t),
		[columns, headings, rows, shownAnchor, t]
	);

	return (
		<DashboardSection title={title} meta={hasRows && meta} ariaLabel={title} className="min-w-0">
			<div
				ref={frameRef}
				className={cn('relative', HEAT_FRAME_BOUNDS, HEAT_FRAME_VARS, HEAT_SLOT_VARS[duration])}
			>
				<div
					className="w-full max-w-full overflow-x-auto overscroll-x-contain scroll-ps-(--wl-member) scroll-pe-(--wl-total)"
					onScroll={handleScroll}
				>
					<div
						ref={gridRef}
						role="grid"
						aria-label={title}
						aria-busy={isUpdating}
						aria-describedby={keysHintId}
						className="w-max min-w-full"
						onPointerOver={handlePointerOver}
						onPointerLeave={clearHovered}
						onFocus={handleFocus}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
					>
						{duration === 'day' && <MonthRow columns={columns} template={template} locale={locale} />}
						<HeaderRow columns={columns} headings={headings} duration={duration} template={template} />
						{rows.map((row, rowIndex) => (
							<HeatRow
								key={row.key}
								row={row}
								rowIndex={rowIndex}
								columns={columns}
								headings={headings}
								duration={duration}
								template={template}
								rovingColumn={rovingColumnOf(safeStop, rowIndex)}
								isHighlighted={row.key === highlightedKey}
							/>
						))}
					</div>
				</div>
				{!hasRows && empty}
				{bubble && <CellBubble anchor={bubble.anchor} label={bubble.label} reading={bubble.reading} />}
				<span id={keysHintId} className="sr-only">
					{t('dashboard.weeklyLimit.HEATMAP_KEYS_HINT')}
				</span>
			</div>
			{hasRows && <HeatFooter membersWithoutTime={membersWithoutTime} />}
		</DashboardSection>
	);
}

const SKELETON_NAME_WIDTHS = [72, 58, 66, 50, 62, 44];

function defaultSkeletonPeriod(): Period {
	return periodOfPreset('thisMonth', LIMIT_WEEK_START);
}

/** Drawn by the route skeleton and by the page while the report loads: the same columns and row height. */
export function LimitHeatmapSkeleton({
	period,
	duration = 'day'
}: Readonly<{ period?: Period; duration?: LimitDuration }>) {
	const t = useTranslations();
	const locale = useLocale();
	const shownPeriod = useMemo(() => period ?? defaultSkeletonPeriod(), [period]);
	const columns = useMemo(() => limitColumnsOf(shownPeriod, duration, DEFAULT_WEEKEND_DAYS), [duration, shownPeriod]);
	const headings = useMemo(
		() => columns.map((column) => headingOf(column, duration, locale)),
		[columns, duration, locale]
	);
	const template = useMemo(() => heatTemplateOf(columns.length), [columns.length]);
	const title = t(TITLE_KEYS[duration]);
	return (
		<DashboardSection title={title} ariaLabel={title} className="min-w-0">
			<div
				aria-busy="true"
				className={cn('overflow-x-clip', HEAT_FRAME_BOUNDS, HEAT_FRAME_VARS, HEAT_SLOT_VARS[duration])}
			>
				<div className="w-max min-w-full">
					<div aria-hidden="true" className="grid min-h-11 hairline-b border-border" style={template}>
						<span className={cn(HEAT_STICKY_START, 'flex items-end ps-4 pb-2')}>
							<span className={cn('h-2 w-14', SKELETON_BAR)} />
						</span>
						{columns.map((column, index) => (
							<span
								key={column.key}
								className={cn(
									'flex flex-col items-center justify-center gap-1 py-1.5',
									column.isWeekend && HEAT_WEEKEND
								)}
							>
								<span className="truncate text-[11px] text-muted-foreground/60">
									{headings[index].top}
								</span>
								<span className="truncate text-xs text-muted-foreground/60">
									{headings[index].bottom}
								</span>
							</span>
						))}
						<span className={cn(HEAT_STICKY_END, 'flex items-end px-4 pb-2')}>
							<span className={cn('h-2 w-20', SKELETON_BAR)} />
						</span>
					</div>
					{SKELETON_NAME_WIDTHS.map((nameWidth, rowIndex) => (
						<div key={rowIndex} aria-hidden="true" className="grid min-h-10" style={template}>
							<span className={cn(HEAT_STICKY_START, 'flex items-center gap-2 ps-4 pe-2')}>
								<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
								<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${nameWidth}%` }} />
							</span>
							{columns.map((column) => (
								<span key={column.key} className={cn(HEAT_SLOT, column.isWeekend && HEAT_WEEKEND)}>
									<span
										className={cn('rounded-sm bg-foreground/[0.035]', HEAT_CELL_SIZES[duration])}
									/>
								</span>
							))}
							<span className={cn(HEAT_STICKY_END, 'flex flex-col justify-center gap-1.5 px-4')}>
								<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
								<span className="block h-2 w-full rounded-[2px] bg-foreground/[0.05]" />
							</span>
						</div>
					))}
				</div>
			</div>
		</DashboardSection>
	);
}
