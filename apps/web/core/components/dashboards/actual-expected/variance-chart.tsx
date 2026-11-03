'use client';

import { type KeyboardEvent, type PointerEvent, memo, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarRounded } from '@visx/shape';
import { TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import {
	signedHoursLabelOf,
	varianceAxisOf,
	type VarianceAxis,
	type VarianceDay
} from '@/core/lib/utils/dashboards/actual-expected';

type Translate = ReturnType<typeof useTranslations>;

const MARGIN = { top: 12, right: 4, bottom: 24, left: 44 };
const BAR_RADIUS = 4;
const MAX_BAR_WIDTH = 28;
const MIN_BAR_HEIGHT = 2;
/** The bars stop one pixel short of the zero line, so the line stays readable between an over and an under bar. */
const ZERO_GAP = 1;
const NO_PLAN_RADIUS = 3.5;
const ON_PLAN_STUB_HEIGHT = 2;
const MIN_LABEL_SPACING = 32;
const BAND_PADDING_INNER = 0.3;
const BAND_PADDING_OUTER = 0.15;

export const VARIANCE_CHART_HEIGHT = 'h-56';

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

type BandScale = ReturnType<typeof scaleBand<string>>;
type LinearScale = ReturnType<typeof scaleLinear<number>>;

interface ColumnGeometry {
	x: number;
	width: number;
	centre: number;
}

function clampIndex(index: number, count: number) {
	return Math.min(Math.max(index, 0), count - 1);
}

function lastBegunIndexOf(days: ReadonlyArray<VarianceDay>) {
	let index = days.length - 1;
	while (index > 0 && days[index]?.isFuture) {
		index -= 1;
	}
	return index;
}

function dayAt(days: ReadonlyArray<VarianceDay>, index: number | null) {
	if (index === null) {
		return null;
	}
	return days[index] ?? null;
}

function columnAt(columns: ReadonlyArray<ColumnGeometry>, index: number | null) {
	if (index === null) {
		return undefined;
	}
	return columns[index];
}

/** A day ahead is read only when it already holds planned hours: there is nothing else in its slot. */
function isReadableDay(day: VarianceDay | null) {
	if (!day) {
		return false;
	}
	if (!day.isFuture) {
		return true;
	}
	return day.planState === 'planned';
}

function slotStartOf(xScale: BandScale, key: string) {
	const bandStart = xScale(key) ?? 0;
	const halfGap = (xScale.step() * BAND_PADDING_INNER) / 2;
	return bandStart - halfGap;
}

function labelStepOf(count: number, innerWidth: number) {
	const fittingLabels = Math.max(1, Math.floor(innerWidth / MIN_LABEL_SPACING));
	return Math.max(1, Math.ceil(count / fittingLabels));
}

function axisLabelClassOf(day: VarianceDay) {
	if (day.isToday) {
		return 'fill-primary-ink font-medium';
	}
	if (day.isFuture) {
		return 'fill-muted-foreground/50';
	}
	return 'fill-muted-foreground';
}

function overClassOf(isActive: boolean) {
	if (isActive) {
		return 'fill-primary';
	}
	return 'fill-primary/85';
}

function underClassOf(isActive: boolean) {
	if (isActive) {
		return 'fill-warning';
	}
	return 'fill-warning/85';
}

function tooltipAlignmentOf(centre: number, width: number) {
	const share = centre / Math.max(width, 1);
	if (share < 0.15) {
		return '-translate-x-4';
	}
	if (share > 0.85) {
		return '-translate-x-[calc(100%-1rem)]';
	}
	return '-translate-x-1/2';
}

function tooltipTopOf(day: VarianceDay, yScale: LinearScale) {
	if (day.over > 0) {
		return yScale(day.over);
	}
	return yScale(0);
}

function isOnPlan(day: VarianceDay) {
	const isPlanned = day.planState === 'planned';
	const hasNoGap = day.over <= 0 && day.under <= 0;
	return isPlanned && hasNoGap;
}

const DayMark = memo(function DayMark({
	day,
	column,
	yScale,
	isActive
}: Readonly<{ day: VarianceDay; column: ColumnGeometry | undefined; yScale: LinearScale; isActive: boolean }>) {
	if (!column || day.isFuture) {
		return null;
	}
	const zeroY = yScale(0);
	const isPlanned = day.planState === 'planned';
	if (!isPlanned) {
		return (
			<circle
				cx={column.centre}
				cy={zeroY}
				r={NO_PLAN_RADIUS}
				strokeWidth={1.5}
				className="fill-card stroke-muted-foreground"
			/>
		);
	}
	if (isOnPlan(day)) {
		return (
			<rect
				x={column.x}
				y={zeroY - ON_PLAN_STUB_HEIGHT / 2}
				width={column.width}
				height={ON_PLAN_STUB_HEIGHT}
				rx={1}
				className="fill-foreground/35"
			/>
		);
	}
	const overTop = yScale(day.over);
	const overHeight = Math.max(zeroY - overTop - ZERO_GAP, MIN_BAR_HEIGHT);
	const underBottom = yScale(-day.under);
	const underHeight = Math.max(underBottom - zeroY - ZERO_GAP, MIN_BAR_HEIGHT);
	const hasOver = day.over > 0;
	const hasUnder = day.under > 0;
	return (
		<g>
			{hasOver && (
				<BarRounded
					x={column.x}
					y={zeroY - ZERO_GAP - overHeight}
					width={column.width}
					height={overHeight}
					radius={BAR_RADIUS}
					top
					className={cn('transition-[fill] duration-150', overClassOf(isActive))}
				/>
			)}
			{hasUnder && (
				<BarRounded
					x={column.x}
					y={zeroY + ZERO_GAP}
					width={column.width}
					height={underHeight}
					radius={BAR_RADIUS}
					bottom
					className={cn('transition-[fill] duration-150', underClassOf(isActive))}
				/>
			)}
		</g>
	);
});

function TooltipRow({
	label,
	value,
	swatchClassName
}: Readonly<{ label: string; value: string; swatchClassName?: string }>) {
	return (
		<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
			<span className="flex items-center gap-1.5">
				{swatchClassName && <span aria-hidden="true" className={cn('size-2 rounded-[2px]', swatchClassName)} />}
				{label}
			</span>
			<span className="font-medium tabular-nums text-foreground">{value}</span>
		</span>
	);
}

function TooltipNote({ children }: Readonly<{ children: string }>) {
	return <span className="text-xs text-muted-foreground">{children}</span>;
}

function planStateNoteOf(day: VarianceDay, t: Translate) {
	if (day.planState === 'withoutTime') {
		return t('dashboard.actualExpected.PLAN_WITHOUT_TIME');
	}
	return t('dashboard.actualExpected.NO_PLAN');
}

function FutureDayRows({ day }: Readonly<{ day: VarianceDay }>) {
	const t = useTranslations();
	return (
		<>
			<TooltipRow label={t('dashboard.actualExpected.PLANNED')} value={formatHoursLabel(day.expected)} />
			<TooltipNote>{t('dashboard.actualExpected.NOT_STARTED')}</TooltipNote>
		</>
	);
}

function UnplannedDayRows({ day }: Readonly<{ day: VarianceDay }>) {
	const t = useTranslations();
	const hasActual = day.actual > 0;
	return (
		<>
			<TooltipNote>{planStateNoteOf(day, t)}</TooltipNote>
			{hasActual && (
				<TooltipRow label={t('dashboard.actualExpected.TRACKED')} value={formatDurationShort(day.actual)} />
			)}
		</>
	);
}

function PlannedDayRows({ day }: Readonly<{ day: VarianceDay }>) {
	const t = useTranslations();
	const hasOver = day.over > 0;
	const hasUnder = day.under > 0;
	const hasUncompared = day.uncomparedActual > 0;
	const onPlan = isOnPlan(day);
	return (
		<>
			<TooltipRow label={t('dashboard.actualExpected.PLANNED')} value={formatHoursLabel(day.expected)} />
			<TooltipRow label={t('dashboard.actualExpected.TRACKED')} value={formatDurationShort(day.actual)} />
			{hasOver && (
				<TooltipRow
					label={t('dashboard.actualExpected.OVER_PLAN')}
					value={t('dashboard.actualExpected.DIFFERENCE_OVER', { duration: formatHoursLabel(day.over) })}
					swatchClassName="bg-primary"
				/>
			)}
			{hasUnder && (
				<TooltipRow
					label={t('dashboard.actualExpected.UNDER_PLAN')}
					value={t('dashboard.actualExpected.DIFFERENCE_UNDER', { duration: formatHoursLabel(day.under) })}
					swatchClassName="bg-warning"
				/>
			)}
			{onPlan && <TooltipNote>{t('dashboard.actualExpected.ON_PLAN')}</TooltipNote>}
			{hasUncompared && (
				<TooltipRow
					label={t('dashboard.actualExpected.WITHOUT_PLANNED_HOURS')}
					value={formatDurationShort(day.uncomparedActual)}
				/>
			)}
		</>
	);
}

function TooltipBody({ day }: Readonly<{ day: VarianceDay }>) {
	if (day.isFuture) {
		return <FutureDayRows day={day} />;
	}
	if (day.planState === 'planned') {
		return <PlannedDayRows day={day} />;
	}
	return <UnplannedDayRows day={day} />;
}

function VarianceTooltip({
	day,
	left,
	top,
	alignment
}: Readonly<{ day: VarianceDay; left: number; top: number; alignment: string }>) {
	return (
		<div
			className={cn('pointer-events-none absolute z-10 -translate-y-full pb-2', alignment)}
			style={{ left, top }}
		>
			<div className={cn(TOOLTIP_SURFACE, 'flex min-w-44 flex-col gap-1 px-2.5 py-2')}>
				<span className="whitespace-nowrap text-xs font-medium text-foreground">{day.label}</span>
				<TooltipBody day={day} />
			</div>
		</div>
	);
}

const MISSING_FIGURE = '–';

function ActiveDayTooltip({
	day,
	column,
	yScale,
	innerWidth
}: Readonly<{
	day: VarianceDay | null;
	column: ColumnGeometry | undefined;
	yScale: LinearScale;
	innerWidth: number;
}>) {
	if (!day || !column) {
		return null;
	}
	const isReadable = isReadableDay(day);
	if (!isReadable) {
		return null;
	}
	const left = MARGIN.left + column.centre;
	const top = MARGIN.top + tooltipTopOf(day, yScale);
	const alignment = tooltipAlignmentOf(column.centre, innerWidth);
	return <VarianceTooltip day={day} left={left} top={top} alignment={alignment} />;
}

function plannedCellOf(day: VarianceDay, t: Translate) {
	if (day.planState === 'planned') {
		return formatHoursLabel(day.expected);
	}
	return planStateNoteOf(day, t);
}

function trackedCellOf(day: VarianceDay, t: Translate) {
	if (day.isFuture) {
		return t('dashboard.actualExpected.NOT_STARTED');
	}
	return formatDurationShort(day.actual);
}

function gapCellOf(day: VarianceDay, seconds: number) {
	const isCompared = day.planState === 'planned';
	const hasGap = isCompared && !day.isFuture;
	if (!hasGap) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(seconds);
}

function ScreenReaderTable({ days, caption }: Readonly<{ days: ReadonlyArray<VarianceDay>; caption: string }>) {
	const t = useTranslations();
	return (
		<table className="sr-only">
			<caption>{caption}</caption>
			<thead>
				<tr>
					<th scope="col">{t('dashboard.weeklyLimit.COLUMN_DAY')}</th>
					<th scope="col">{t('dashboard.actualExpected.PLANNED')}</th>
					<th scope="col">{t('dashboard.actualExpected.TRACKED')}</th>
					<th scope="col">{t('dashboard.actualExpected.OVER_PLAN')}</th>
					<th scope="col">{t('dashboard.actualExpected.UNDER_PLAN')}</th>
				</tr>
			</thead>
			<tbody>
				{days.map((day) => (
					<tr key={day.dayKey}>
						<th scope="row">{day.label}</th>
						<td>{plannedCellOf(day, t)}</td>
						<td>{trackedCellOf(day, t)}</td>
						<td>{gapCellOf(day, day.over)}</td>
						<td>{gapCellOf(day, day.under)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/** The zero line is drawn on its own, stronger than the hour lines. */
function gridTicksOf(axis: VarianceAxis) {
	return axis.ticks.filter((tick) => tick !== 0);
}

/** Some members over and others under on the same day give both bars: a day is never netted. */
export const VarianceChart = memo(function VarianceChart({
	days,
	ariaLabel
}: Readonly<{ days: ReadonlyArray<VarianceDay>; ariaLabel: string }>) {
	const { parentRef, width, height } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const count = days.length;
	const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
	const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
	const isMeasured = innerWidth > 0 && innerHeight > 0;
	const axis = useMemo(() => varianceAxisOf(days), [days]);
	const gridTicks = useMemo(() => gridTicksOf(axis), [axis]);

	const xScale = useMemo(
		() =>
			scaleBand<string>({
				domain: days.map((day) => day.dayKey),
				range: [0, innerWidth],
				paddingInner: BAND_PADDING_INNER,
				paddingOuter: BAND_PADDING_OUTER
			}),
		[days, innerWidth]
	);

	const yScale = useMemo(
		() => scaleLinear<number>({ domain: [axis.min, axis.max], range: [innerHeight, 0], clamp: true }),
		[axis.max, axis.min, innerHeight]
	);

	const columns = useMemo<ColumnGeometry[]>(() => {
		const bandWidth = xScale.bandwidth();
		const barWidth = Math.min(bandWidth, MAX_BAR_WIDTH);
		return days.map((day) => {
			const bandStart = xScale(day.dayKey) ?? 0;
			const centre = bandStart + bandWidth / 2;
			return { x: centre - barWidth / 2, width: barWidth, centre };
		});
	}, [days, xScale]);

	const labelStep = labelStepOf(count, innerWidth);
	const activeDay = dayAt(days, activeIndex);
	const activeColumn = columnAt(columns, activeIndex);
	const activeKey = activeDay?.dayKey ?? '';
	const highlightX = slotStartOf(xScale, activeKey);
	const zeroY = yScale(0);

	const handlePointerMove = useCallback(
		(event: PointerEvent<SVGRectElement>) => {
			const point = localPoint(event);
			if (!point || count === 0) {
				return;
			}
			const step = xScale.step();
			const firstKey = days[0]?.dayKey ?? '';
			const firstStart = slotStartOf(xScale, firstKey);
			const offset = point.x - MARGIN.left - firstStart;
			const rawIndex = Math.floor(offset / step);
			const nextIndex = clampIndex(rawIndex, count);
			setActiveIndex(nextIndex);
		},
		[count, days, xScale]
	);

	const handlePointerLeave = useCallback(() => setActiveIndex(null), []);

	const handleFocus = useCallback(() => {
		setActiveIndex((current) => {
			if (current !== null) {
				return current;
			}
			return lastBegunIndexOf(days);
		});
	}, [days]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (event.key === 'Escape') {
				setActiveIndex(null);
				return;
			}
			const step = KEY_STEPS[event.key];
			if (!step || count === 0) {
				return;
			}
			event.preventDefault();
			setActiveIndex((current) => {
				const start = current ?? lastBegunIndexOf(days);
				return clampIndex(start + step, count);
			});
		},
		[count, days]
	);

	return (
		<div className="flex flex-col">
			<div
				ref={parentRef}
				tabIndex={0}
				role="group"
				aria-label={ariaLabel}
				onFocus={handleFocus}
				onBlur={handlePointerLeave}
				onKeyDown={handleKeyDown}
				className={cn(
					'relative w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
					VARIANCE_CHART_HEIGHT
				)}
			>
				{isMeasured && (
					<svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
						<Group left={MARGIN.left} top={MARGIN.top}>
							<GridRows
								scale={yScale}
								width={innerWidth}
								tickValues={gridTicks}
								stroke="currentColor"
								className="text-foreground/[0.07]"
								strokeWidth={1}
								shapeRendering="crispEdges"
							/>
							{axis.ticks.map((tick) => (
								<text
									key={tick}
									x={-10}
									y={yScale(tick)}
									dy="0.32em"
									textAnchor="end"
									className="fill-muted-foreground text-[11px] tabular-nums"
								>
									{signedHoursLabelOf(tick)}
								</text>
							))}
							{activeColumn && (
								<rect
									x={highlightX}
									y={0}
									width={xScale.step()}
									height={innerHeight}
									rx={6}
									className="fill-foreground/[0.04]"
								/>
							)}
							<line
								x1={0}
								x2={innerWidth}
								y1={zeroY}
								y2={zeroY}
								className="stroke-foreground/30"
								strokeWidth={1}
								shapeRendering="crispEdges"
							/>
							{days.map((day, index) => (
								<DayMark
									key={day.dayKey}
									day={day}
									column={columns[index]}
									yScale={yScale}
									isActive={index === activeIndex}
								/>
							))}
							{days.map((day, index) => {
								const showsLabel = index % labelStep === 0;
								if (!showsLabel) {
									return null;
								}
								return (
									<text
										key={day.dayKey}
										x={columns[index]?.centre ?? 0}
										y={innerHeight + 16}
										textAnchor="middle"
										className={cn('text-[11px] tabular-nums', axisLabelClassOf(day))}
									>
										{day.axisLabel}
									</text>
								);
							})}
							<rect
								x={0}
								y={0}
								width={innerWidth}
								height={innerHeight}
								fill="transparent"
								onPointerMove={handlePointerMove}
								onPointerLeave={handlePointerLeave}
							/>
						</Group>
					</svg>
				)}
				<ActiveDayTooltip day={activeDay} column={activeColumn} yScale={yScale} innerWidth={innerWidth} />
			</div>
			<ScreenReaderTable days={days} caption={ariaLabel} />
		</div>
	);
});

const SKELETON_COLUMNS = [
	{ up: 34, down: 0 },
	{ up: 0, down: 22 },
	{ up: 48, down: 12 },
	{ up: 18, down: 0 },
	{ up: 0, down: 38 },
	{ up: 0, down: 0 },
	{ up: 26, down: 0 }
];

export function VarianceChartSkeleton() {
	return (
		<div aria-hidden="true" className={cn('grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3', VARIANCE_CHART_HEIGHT)}>
			<div className="flex flex-col justify-between py-3">
				<span className="h-2 w-6 self-end animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className="h-2 w-3 self-end animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className="h-2 w-6 self-end animate-pulse rounded-full bg-foreground/[0.06]" />
			</div>
			<div className="relative flex pb-6">
				<span className="absolute inset-x-0 top-[calc(50%-12px)] h-px bg-foreground/15" />
				{SKELETON_COLUMNS.map((column) => (
					<div key={`${column.up}-${column.down}`} className="grid flex-1 grid-rows-2 px-[14%]">
						<span className="flex items-end justify-center pb-px">
							<span
								className="block w-full max-w-7 animate-pulse rounded-t-[4px] bg-foreground/[0.05]"
								style={{ height: `${column.up}%` }}
							/>
						</span>
						<span className="flex items-start justify-center pt-px">
							<span
								className="block w-full max-w-7 animate-pulse rounded-b-[4px] bg-foreground/[0.05]"
								style={{ height: `${column.down}%` }}
							/>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
