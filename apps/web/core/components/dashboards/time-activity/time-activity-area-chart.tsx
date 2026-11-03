'use client';

import { type KeyboardEvent, type PointerEvent, memo, useCallback, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import {
	type TimeAxis,
	formatDurationShort,
	formatHoursLabel,
	formatPercent,
	timeAxisOf
} from '@/core/lib/utils/dashboard-figures';
import { dayActivityPercentOf, hasActivityIn, maxSecondsOf } from '@/core/lib/utils/dashboards/time-activity';

const MARGIN = { top: 12, bottom: 24, left: 44 };
const RIGHT_MARGIN_WITH_AXIS = 40;
const RIGHT_MARGIN = 12;
const ACTIVITY_TICKS = [0, 50, 100];
const MIN_LABEL_SPACING = 44;
/** Up to this many days every day carries its point; past it only the day under the pointer does. */
const DOT_DAY_LIMIT = 14;
const MISSING_VALUE = '–';

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

export const AREA_CHART_HEIGHT = 'h-56';

export interface AreaChartLabels {
	ariaLabel: string;
	tracked: string;
	activity: string;
	empty: string;
}

type PointScale = ReturnType<typeof scalePoint<string>>;
type LinearScale = ReturnType<typeof scaleLinear<number>>;

function isPastDay(day: DayBarDatum) {
	return !day.isFuture;
}

function hasTrackedTime(day: DayBarDatum) {
	return day.value > 0;
}

function hasDayActivity(day: DayBarDatum) {
	return dayActivityPercentOf(day) !== null;
}

function rightMarginOf(showsActivity: boolean) {
	if (showsActivity) {
		return RIGHT_MARGIN_WITH_AXIS;
	}
	return RIGHT_MARGIN;
}

function clampIndex(index: number, count: number) {
	return Math.min(Math.max(index, 0), count - 1);
}

function lastPastIndexOf(days: ReadonlyArray<DayBarDatum>) {
	let index = days.length - 1;
	while (index > 0 && days[index]?.isFuture) {
		index -= 1;
	}
	return index;
}

/** Only a day that has started has something to read: a future slot shows no rule and no tooltip. */
function pastDayAt(days: ReadonlyArray<DayBarDatum>, index: number | null) {
	if (index === null) {
		return null;
	}
	const day = days[index];
	if (!day) {
		return null;
	}
	if (day.isFuture) {
		return null;
	}
	return day;
}

function labelStepOf(count: number, innerWidth: number) {
	const labelSlots = Math.floor(innerWidth / MIN_LABEL_SPACING);
	const fittingLabels = Math.max(1, labelSlots);
	const step = Math.ceil(count / fittingLabels);
	return Math.max(1, step);
}

function axisLabelClassOf(day: DayBarDatum) {
	if (day.isToday) {
		return 'fill-primary-ink font-medium';
	}
	if (day.isFuture) {
		return 'fill-muted-foreground/50';
	}
	return 'fill-muted-foreground';
}

function tooltipAlignmentOf(x: number, width: number) {
	const safeWidth = Math.max(width, 1);
	const share = x / safeWidth;
	if (share < 0.15) {
		return '-translate-x-4';
	}
	if (share > 0.85) {
		return '-translate-x-[calc(100%-1rem)]';
	}
	return '-translate-x-1/2';
}

function activityTextOf(day: DayBarDatum, locale: string) {
	const percent = dayActivityPercentOf(day);
	if (percent === null) {
		return MISSING_VALUE;
	}
	return formatPercent(percent, locale);
}

interface ChartScales {
	x: PointScale;
	time: LinearScale;
	activity: LinearScale;
}

function pointXOf(scales: ChartScales, day: DayBarDatum) {
	return scales.x(day.key) ?? 0;
}

function trackedYOf(scales: ChartScales, day: DayBarDatum) {
	return scales.time(day.value);
}

function activityYOf(scales: ChartScales, day: DayBarDatum) {
	const dayPercent = dayActivityPercentOf(day);
	const percent = dayPercent ?? 0;
	return scales.activity(percent);
}

function tooltipTopOf(scales: ChartScales, day: DayBarDatum, showsActivity: boolean) {
	const trackedY = trackedYOf(scales, day);
	if (!showsActivity) {
		return trackedY;
	}
	const activityY = activityYOf(scales, day);
	return Math.min(trackedY, activityY);
}

interface TooltipPlacement {
	left: number;
	top: number;
	alignment: string;
}

function tooltipPlacementOf(
	scales: ChartScales,
	day: DayBarDatum,
	showsActivity: boolean,
	innerWidth: number
): TooltipPlacement {
	const x = pointXOf(scales, day);
	const pointTop = tooltipTopOf(scales, day, showsActivity);
	return {
		left: MARGIN.left + x,
		top: MARGIN.top + pointTop,
		alignment: tooltipAlignmentOf(x, innerWidth)
	};
}

function ChartTooltip({
	day,
	placement,
	labels,
	showsActivity
}: Readonly<{
	day: DayBarDatum;
	placement: TooltipPlacement;
	labels: AreaChartLabels;
	showsActivity: boolean;
}>) {
	const locale = useLocale();
	return (
		<div
			role="presentation"
			className={cn('pointer-events-none absolute z-10 -translate-y-full pb-3', placement.alignment)}
			style={{ left: placement.left, top: placement.top }}
		>
			<div className={cn(TOOLTIP_SURFACE, 'flex min-w-40 flex-col gap-1 px-2.5 py-2')}>
				<span className="whitespace-nowrap text-xs font-medium text-foreground">{day.label}</span>
				<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span aria-hidden="true" className="size-2 rounded-[2px] bg-primary" />
						{labels.tracked}
					</span>
					<span className="font-medium tabular-nums text-foreground">{formatDurationShort(day.value)}</span>
				</span>
				{showsActivity && (
					<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="h-0.5 w-2.5 rounded-full bg-info" />
							{labels.activity}
						</span>
						<span className="font-medium tabular-nums text-foreground">{activityTextOf(day, locale)}</span>
					</span>
				)}
			</div>
		</div>
	);
}

function TimeTicks({ axis, scale, width }: Readonly<{ axis: TimeAxis; scale: LinearScale; width: number }>) {
	return (
		<>
			<GridRows
				scale={scale}
				width={width}
				tickValues={axis.ticks}
				stroke="currentColor"
				className="text-foreground/[0.08]"
				strokeWidth={1}
				shapeRendering="crispEdges"
			/>
			{axis.ticks.map((tick) => (
				<text
					key={tick}
					x={-10}
					y={scale(tick)}
					dy="0.32em"
					textAnchor="end"
					className="fill-muted-foreground text-[11px] tabular-nums"
				>
					{formatHoursLabel(tick)}
				</text>
			))}
		</>
	);
}

function ActivityTicks({ scale, x }: Readonly<{ scale: LinearScale; x: number }>) {
	const locale = useLocale();
	return (
		<>
			{ACTIVITY_TICKS.map((tick) => (
				<text
					key={tick}
					x={x + 10}
					y={scale(tick)}
					dy="0.32em"
					textAnchor="start"
					className="fill-info-foreground text-[11px] tabular-nums"
				>
					{formatPercent(tick, locale)}
				</text>
			))}
		</>
	);
}

function DayLabels({
	days,
	scales,
	innerHeight,
	labelStep
}: Readonly<{ days: ReadonlyArray<DayBarDatum>; scales: ChartScales; innerHeight: number; labelStep: number }>) {
	return (
		<>
			{days.map((day, index) => {
				const showsLabel = index % labelStep === 0;
				if (!showsLabel) {
					return null;
				}
				return (
					<text
						key={day.key}
						x={pointXOf(scales, day)}
						y={innerHeight + 16}
						textAnchor="middle"
						className={cn('text-[11px] tabular-nums', axisLabelClassOf(day))}
					>
						{day.axisLabel}
					</text>
				);
			})}
		</>
	);
}

function DayDots({ days, scales }: Readonly<{ days: ReadonlyArray<DayBarDatum>; scales: ChartScales }>) {
	return (
		<>
			{days.map((day) => (
				<circle
					key={day.key}
					cx={pointXOf(scales, day)}
					cy={trackedYOf(scales, day)}
					r={2.5}
					strokeWidth={1.5}
					className="fill-card stroke-primary"
				/>
			))}
		</>
	);
}

function ActiveDay({
	day,
	scales,
	innerHeight,
	showsActivity
}: Readonly<{ day: DayBarDatum; scales: ChartScales; innerHeight: number; showsActivity: boolean }>) {
	const x = pointXOf(scales, day);
	const drawsActivityPoint = showsActivity && hasDayActivity(day);
	return (
		<g aria-hidden="true">
			<line
				x1={x}
				x2={x}
				y1={0}
				y2={innerHeight}
				strokeWidth={1}
				className="stroke-foreground/25"
				shapeRendering="crispEdges"
			/>
			<circle cx={x} cy={trackedYOf(scales, day)} r={4} strokeWidth={2} className="fill-primary stroke-card" />
			{drawsActivityPoint && (
				<circle
					cx={x}
					cy={activityYOf(scales, day)}
					r={3.5}
					strokeWidth={2}
					className="fill-info stroke-card"
				/>
			)}
		</g>
	);
}

/**
 * A period without any activity (the web timer records none) has no activity line and no right axis, so it never
 * reads as 0%. Days after today keep their slot with nothing drawn.
 */
export const TimeActivityAreaChart = memo(function TimeActivityAreaChart({
	days,
	labels,
	heightClassName = AREA_CHART_HEIGHT
}: Readonly<{ days: ReadonlyArray<DayBarDatum>; labels: AreaChartLabels; heightClassName?: string }>) {
	const locale = useLocale();
	const { parentRef, width, height } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const count = days.length;
	const showsActivity = hasActivityIn(days);
	const rightMargin = rightMarginOf(showsActivity);
	const plotWidth = width - MARGIN.left - rightMargin;
	const plotHeight = height - MARGIN.top - MARGIN.bottom;
	const innerWidth = Math.max(plotWidth, 0);
	const innerHeight = Math.max(plotHeight, 0);
	const isMeasured = innerWidth > 0 && innerHeight > 0;
	const isEmpty = !days.some(hasTrackedTime);

	const axis = useMemo(() => {
		const maxSeconds = maxSecondsOf(days);
		return timeAxisOf(maxSeconds);
	}, [days]);
	const pastDays = useMemo(() => days.filter(isPastDay), [days]);

	const scales = useMemo<ChartScales>(() => {
		const domain = days.map((day) => day.key);
		return {
			x: scalePoint<string>({ domain, range: [0, innerWidth], padding: 0.5 }),
			time: scaleLinear<number>({ domain: [0, axis.max], range: [innerHeight, 0], clamp: true }),
			activity: scaleLinear<number>({ domain: [0, 100], range: [innerHeight, 0], clamp: true })
		};
	}, [axis.max, days, innerHeight, innerWidth]);

	const xOf = useCallback((day: DayBarDatum) => pointXOf(scales, day), [scales]);
	const trackedOf = useCallback((day: DayBarDatum) => trackedYOf(scales, day), [scales]);
	const activityOf = useCallback((day: DayBarDatum) => activityYOf(scales, day), [scales]);

	const activeDay = pastDayAt(days, activeIndex);
	const labelStep = labelStepOf(count, innerWidth);
	const showsDots = pastDays.length <= DOT_DAY_LIMIT;

	const handlePointerMove = useCallback(
		(event: PointerEvent<SVGRectElement>) => {
			const point = localPoint(event);
			const firstDay = days[0];
			if (!point || !firstDay) {
				return;
			}
			const pointStep = scales.x.step();
			const step = Math.max(pointStep, 1);
			const firstX = pointXOf(scales, firstDay);
			const offset = point.x - MARGIN.left - firstX;
			const nearestIndex = Math.round(offset / step);
			const nextIndex = clampIndex(nearestIndex, count);
			setActiveIndex((current) => {
				if (current === nextIndex) {
					return current;
				}
				return nextIndex;
			});
		},
		[count, days, scales]
	);

	const handlePointerLeave = useCallback(() => setActiveIndex(null), []);

	const handleFocus = useCallback(() => {
		setActiveIndex((current) => {
			if (current !== null) {
				return current;
			}
			return lastPastIndexOf(days);
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
				const start = current ?? lastPastIndexOf(days);
				const nextIndex = start + step;
				return clampIndex(nextIndex, count);
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
				aria-label={labels.ariaLabel}
				onFocus={handleFocus}
				onBlur={handlePointerLeave}
				onKeyDown={handleKeyDown}
				className={cn(
					'relative w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
					heightClassName
				)}
			>
				{isMeasured && (
					<svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
						<Group left={MARGIN.left} top={MARGIN.top}>
							<TimeTicks axis={axis} scale={scales.time} width={innerWidth} />
							{showsActivity && <ActivityTicks scale={scales.activity} x={innerWidth} />}
							<AreaClosed<DayBarDatum>
								data={pastDays}
								x={xOf}
								y={trackedOf}
								yScale={scales.time}
								className="fill-primary/10"
							/>
							<LinePath<DayBarDatum>
								data={pastDays}
								x={xOf}
								y={trackedOf}
								fill="none"
								strokeWidth={2}
								strokeLinejoin="round"
								strokeLinecap="round"
								className="stroke-primary"
							/>
							{showsActivity && (
								<LinePath<DayBarDatum>
									data={pastDays}
									x={xOf}
									y={activityOf}
									defined={hasDayActivity}
									fill="none"
									strokeWidth={1.5}
									strokeLinejoin="round"
									strokeLinecap="round"
									className="stroke-info"
								/>
							)}
							{showsDots && <DayDots days={pastDays} scales={scales} />}
							{activeDay && (
								<ActiveDay
									day={activeDay}
									scales={scales}
									innerHeight={innerHeight}
									showsActivity={showsActivity}
								/>
							)}
							<DayLabels days={days} scales={scales} innerHeight={innerHeight} labelStep={labelStep} />
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
				{isEmpty && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
							{labels.empty}
						</p>
					</div>
				)}
				{activeDay && (
					<ChartTooltip
						day={activeDay}
						placement={tooltipPlacementOf(scales, activeDay, showsActivity, innerWidth)}
						labels={labels}
						showsActivity={showsActivity}
					/>
				)}
			</div>
			<table className="sr-only">
				<caption>{labels.ariaLabel}</caption>
				<tbody>
					{pastDays.map((day) => (
						<tr key={day.key}>
							<th scope="row">{day.label}</th>
							<td>
								{labels.tracked} {formatDurationShort(day.value)}
							</td>
							{showsActivity && (
								<td>
									{labels.activity} {activityTextOf(day, locale)}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
});

const SKELETON_WAVE = 'M0 70 L14 52 L28 60 L42 34 L56 44 L70 26 L84 40 L100 30 L100 100 L0 100 Z';

export function TimeActivityAreaChartSkeleton({
	heightClassName = AREA_CHART_HEIGHT
}: Readonly<{ heightClassName?: string }>) {
	return (
		<div className="flex flex-col gap-2" aria-hidden="true">
			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
				<div className={cn('flex w-8 flex-col justify-between py-1', heightClassName)}>
					<span className={cn('h-2 w-5 self-end', SKELETON_BAR)} />
					<span className={cn('h-2 w-5 self-end', SKELETON_BAR)} />
					<span className={cn('h-2 w-4 self-end', SKELETON_BAR)} />
				</div>
				<div className={cn('relative', heightClassName)}>
					<svg
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						className="absolute inset-0 size-full animate-pulse"
					>
						<path d={SKELETON_WAVE} className="fill-foreground/[0.05]" />
					</svg>
				</div>
			</div>
			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
				<span className="w-8" />
				<span className={cn('h-2 w-full', SKELETON_BAR)} />
			</div>
		</div>
	);
}
