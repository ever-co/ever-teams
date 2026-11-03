'use client';

import { type KeyboardEvent, type PointerEvent, memo, useCallback, useMemo, useState } from 'react';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarRounded } from '@visx/shape';
import { TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import type { TimeAxis } from '@/core/lib/utils/dashboard-figures';

export interface DayBarDatum {
	key: string;
	/** The full name of the slot, read in the tooltip: "Monday, Nov 3". */
	label: string;
	/** The short label under the column: "3", "Mon". */
	axisLabel: string;
	value: number;
	/** A share of `value` drawn inside the bar (active time inside tracked time). */
	part?: number;
	isToday?: boolean;
	/** Days after today keep their slot so the period keeps its width, with no bar. */
	isFuture?: boolean;
	/** What the slot was expected to reach (planned time), drawn as a short marker across it, future days included. */
	target?: number;
}

interface DayBarsChartProps {
	data: ReadonlyArray<DayBarDatum>;
	axis: TimeAxis;
	ariaLabel: string;
	valueLabel: string;
	partLabel?: string;
	formatValue: (value: number) => string;
	formatTick: (value: number) => string;
	/** A dashed line at this value; bars above it take the warning tone. */
	limit?: number;
	limitLabel?: string;
	/** Names the per-slot `target` in the tooltip and the screen-reader table. */
	targetLabel?: string;
	heightClassName?: string;
}

const MARGIN = { top: 10, right: 4, bottom: 24, left: 44 };
const BAR_RADIUS = 4;
const MAX_BAR_WIDTH = 32;
const MIN_LABEL_SPACING = 40;
const ZERO_STUB_HEIGHT = 2;
const BAND_PADDING_INNER = 0.3;
const BAND_PADDING_OUTER = 0.15;

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

function clampIndex(index: number, count: number) {
	return Math.min(Math.max(index, 0), count - 1);
}

function lastPastIndexOf(data: ReadonlyArray<DayBarDatum>) {
	let index = data.length - 1;
	while (index > 0 && data[index]?.isFuture) {
		index -= 1;
	}
	return index;
}

function datumAt(data: ReadonlyArray<DayBarDatum>, index: number | null) {
	if (index === null) {
		return null;
	}
	return data[index] ?? null;
}

function isOverLimit(value: number, limit: number | undefined) {
	if (limit === undefined) {
		return false;
	}
	return value > limit;
}

/** Without any active time in the period (a web timer records none), bars are drawn whole, never as an empty track. */
function hasVisiblePart(data: ReadonlyArray<DayBarDatum>) {
	return data.some((datum) => (datum.part ?? 0) > 0);
}

type BandScale = ReturnType<typeof scaleBand<string>>;

/** Where a day's slot starts, its band plus half the gap before it, so slots tile the plot without holes. */
function slotStartOf(xScale: BandScale, key: string) {
	const bandStart = xScale(key) ?? 0;
	const halfGap = (xScale.step() * BAND_PADDING_INNER) / 2;
	return bandStart - halfGap;
}

function hasTarget(datum: DayBarDatum | null | undefined) {
	return typeof datum?.target === 'number' && datum.target > 0;
}

function hasAnyTarget(data: ReadonlyArray<DayBarDatum>) {
	return data.some((datum) => hasTarget(datum));
}

/** A future day shows its tooltip only when it carries a target: there is nothing else to read in it. */
function isReadableDatum(datum: DayBarDatum | null) {
	if (!datum) {
		return false;
	}
	if (!datum.isFuture) {
		return true;
	}
	return hasTarget(datum);
}

/** The tooltip sits on the higher of the bar and the target marker. */
function tooltipValueOf(datum: DayBarDatum) {
	const target = datum.target ?? 0;
	return Math.max(datum.value, target);
}

function columnAt(columns: ReadonlyArray<ColumnGeometry>, index: number | null) {
	if (index === null) {
		return undefined;
	}
	return columns[index];
}

function labelStepOf(count: number, innerWidth: number) {
	const fittingLabels = Math.max(1, Math.floor(innerWidth / MIN_LABEL_SPACING));
	return Math.max(1, Math.ceil(count / fittingLabels));
}

function barClassOf(isActive: boolean, isOver: boolean, showsPart: boolean) {
	if (isOver) {
		return 'fill-warning';
	}
	if (showsPart) {
		return 'fill-primary/25';
	}
	if (isActive) {
		return 'fill-primary';
	}
	return 'fill-primary/80';
}

function partClassOf(isActive: boolean) {
	if (isActive) {
		return 'fill-primary';
	}
	return 'fill-primary/90';
}

function axisLabelClassOf(datum: DayBarDatum) {
	if (datum.isToday) {
		return 'fill-primary-ink font-medium';
	}
	if (datum.isFuture) {
		return 'fill-muted-foreground/50';
	}
	return 'fill-muted-foreground';
}

interface ColumnGeometry {
	x: number;
	width: number;
	centre: number;
}

function ChartTooltip({
	datum,
	left,
	top,
	alignment,
	valueLabel,
	partLabel,
	targetLabel,
	showsPart,
	formatValue
}: Readonly<{
	datum: DayBarDatum;
	left: number;
	top: number;
	alignment: string;
	valueLabel: string;
	partLabel?: string;
	targetLabel?: string;
	showsPart: boolean;
	formatValue: (value: number) => string;
}>) {
	const showsPartRow = showsPart && Boolean(partLabel);
	const showsTargetRow = hasTarget(datum) && Boolean(targetLabel);
	const showsValueRow = !datum.isFuture;
	return (
		<div
			role="presentation"
			className={cn('pointer-events-none absolute z-10 -translate-y-full pb-2', alignment)}
			style={{ left, top }}
		>
			<div className={cn(TOOLTIP_SURFACE, 'flex min-w-36 flex-col gap-1 px-2.5 py-2')}>
				<span className="whitespace-nowrap text-xs font-medium text-foreground">{datum.label}</span>
				{showsValueRow && (
					<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="size-2 rounded-[2px] bg-primary" />
							{valueLabel}
						</span>
						<span className="font-medium tabular-nums text-foreground">{formatValue(datum.value)}</span>
					</span>
				)}
				{showsTargetRow && (
					<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="h-0.5 w-2 rounded-full bg-foreground/60" />
							{targetLabel}
						</span>
						<span className="font-medium tabular-nums text-foreground">
							{formatValue(datum.target ?? 0)}
						</span>
					</span>
				)}
				{showsPartRow && (
					<span className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="size-2 rounded-[2px] bg-primary/25" />
							{partLabel}
						</span>
						<span className="font-medium tabular-nums text-foreground">{formatValue(datum.part ?? 0)}</span>
					</span>
				)}
			</div>
		</div>
	);
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

/**
 * One column per day on an SVG drawn with visx scales and shapes: three or four round hour lines, rounded bars,
 * today's label in ink, future days kept as empty slots, a flat stub on a zero day, an optional dashed limit with
 * the bars above it in the warning tone. Active time sits inside the tracked bar only when the period has some.
 * One pointer handler finds the column under the pointer, arrow keys walk the days, a hidden table gives the values
 * to screen readers.
 */
export const DayBarsChart = memo(function DayBarsChart({
	data,
	axis,
	ariaLabel,
	valueLabel,
	partLabel,
	formatValue,
	formatTick,
	limit,
	limitLabel,
	targetLabel,
	heightClassName = 'h-48'
}: Readonly<DayBarsChartProps>) {
	const { parentRef, width, height } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const count = data.length;
	const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
	const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
	const isMeasured = innerWidth > 0 && innerHeight > 0;
	const showsPart = hasVisiblePart(data);
	const hasLimit = typeof limit === 'number' && limit > 0;

	const xScale = useMemo(
		() =>
			scaleBand<string>({
				domain: data.map((datum) => datum.key),
				range: [0, innerWidth],
				paddingInner: BAND_PADDING_INNER,
				paddingOuter: BAND_PADDING_OUTER
			}),
		[data, innerWidth]
	);

	const yScale = useMemo(
		() => scaleLinear<number>({ domain: [0, axis.max], range: [innerHeight, 0], clamp: true }),
		[axis.max, innerHeight]
	);

	const columns = useMemo<ColumnGeometry[]>(() => {
		const bandWidth = xScale.bandwidth();
		const barWidth = Math.min(bandWidth, MAX_BAR_WIDTH);
		return data.map((datum) => {
			const bandStart = xScale(datum.key) ?? 0;
			const centre = bandStart + bandWidth / 2;
			return { x: centre - barWidth / 2, width: barWidth, centre };
		});
	}, [data, xScale]);

	const labelStep = labelStepOf(count, innerWidth);
	const activeDatum = datumAt(data, activeIndex);
	const activeColumn = columnAt(columns, activeIndex);
	const activeKey = activeDatum?.key ?? '';
	const highlightX = slotStartOf(xScale, activeKey);
	const showsTooltip = Boolean(activeColumn) && isReadableDatum(activeDatum);
	const showsTargets = hasAnyTarget(data);

	const handlePointerMove = useCallback(
		(event: PointerEvent<SVGRectElement>) => {
			const point = localPoint(event);
			if (!point || count === 0) {
				return;
			}
			const step = xScale.step();
			const firstKey = data[0]?.key ?? '';
			const firstStart = slotStartOf(xScale, firstKey);
			const offset = point.x - MARGIN.left - firstStart;
			const rawIndex = Math.floor(offset / step);
			const nextIndex = clampIndex(rawIndex, count);
			setActiveIndex((current) => {
				if (current === nextIndex) {
					return current;
				}
				return nextIndex;
			});
		},
		[count, data, xScale]
	);

	const handlePointerLeave = useCallback(() => setActiveIndex(null), []);

	const handleFocus = useCallback(() => {
		setActiveIndex((current) => {
			if (current !== null) {
				return current;
			}
			return lastPastIndexOf(data);
		});
	}, [data]);

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
				const start = current ?? lastPastIndexOf(data);
				return clampIndex(start + step, count);
			});
		},
		[count, data]
	);

	const limitY = yScale(limit ?? 0);

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
					heightClassName
				)}
			>
				{isMeasured && (
					<svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
						<Group left={MARGIN.left} top={MARGIN.top}>
							<GridRows
								scale={yScale}
								width={innerWidth}
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
									y={yScale(tick)}
									dy="0.32em"
									textAnchor="end"
									className="fill-muted-foreground text-[11px] tabular-nums"
								>
									{formatTick(tick)}
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
							{data.map((datum, index) => (
								<DayBar
									key={datum.key}
									datum={datum}
									column={columns[index]}
									yScale={yScale}
									innerHeight={innerHeight}
									isActive={index === activeIndex}
									isOver={isOverLimit(datum.value, limit)}
									showsPart={showsPart}
								/>
							))}
							{showsTargets && (
								<g aria-hidden="true">
									{data.map((datum, index) => (
										<TargetMark
											key={datum.key}
											datum={datum}
											column={columns[index]}
											yScale={yScale}
											isActive={index === activeIndex}
										/>
									))}
								</g>
							)}
							{hasLimit && (
								<g aria-hidden="true">
									<line
										x1={0}
										x2={innerWidth}
										y1={limitY}
										y2={limitY}
										strokeDasharray="4 4"
										className="stroke-warning"
										shapeRendering="crispEdges"
									/>
									{limitLabel && (
										<text
											x={innerWidth}
											y={limitY - 4}
											textAnchor="end"
											className="fill-warning-foreground text-[11px] font-medium"
										>
											{limitLabel}
										</text>
									)}
								</g>
							)}
							{data.map((datum, index) => {
								const showsLabel = index % labelStep === 0;
								if (!showsLabel) {
									return null;
								}
								return (
									<text
										key={datum.key}
										x={columns[index]?.centre ?? 0}
										y={innerHeight + 16}
										textAnchor="middle"
										className={cn('text-[11px] tabular-nums', axisLabelClassOf(datum))}
									>
										{datum.axisLabel}
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
				{showsTooltip && activeDatum && activeColumn && (
					<ChartTooltip
						datum={activeDatum}
						left={MARGIN.left + activeColumn.centre}
						top={MARGIN.top + yScale(tooltipValueOf(activeDatum))}
						alignment={tooltipAlignmentOf(activeColumn.centre, innerWidth)}
						valueLabel={valueLabel}
						partLabel={partLabel}
						targetLabel={targetLabel}
						showsPart={showsPart}
						formatValue={formatValue}
					/>
				)}
			</div>
			<table className="sr-only">
				<caption>{ariaLabel}</caption>
				<tbody>
					{data.map((datum) => (
						<tr key={datum.key}>
							<th scope="row">{datum.label}</th>
							<td>{formatValue(datum.value)}</td>
							{showsTargets && (
								<td>
									{targetLabel} {formatValue(datum.target ?? 0)}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
});

const DayBar = memo(function DayBar({
	datum,
	column,
	yScale,
	innerHeight,
	isActive,
	isOver,
	showsPart
}: Readonly<{
	datum: DayBarDatum;
	column: ColumnGeometry | undefined;
	yScale: (value: number) => number;
	innerHeight: number;
	isActive: boolean;
	isOver: boolean;
	showsPart: boolean;
}>) {
	if (!column || datum.isFuture) {
		return null;
	}
	const isEmpty = datum.value <= 0;
	if (isEmpty) {
		return (
			<rect
				x={column.x}
				y={innerHeight - ZERO_STUB_HEIGHT}
				width={column.width}
				height={ZERO_STUB_HEIGHT}
				rx={1}
				className="fill-foreground/10"
			/>
		);
	}
	const barTop = yScale(datum.value);
	const barHeight = Math.max(innerHeight - barTop, ZERO_STUB_HEIGHT);
	const partValue = Math.min(datum.part ?? 0, datum.value);
	const partTop = yScale(partValue);
	const partHeight = innerHeight - partTop;
	const drawsPart = showsPart && partHeight > 0;
	const partIsWholeBar = partValue >= datum.value;
	return (
		<g>
			<BarRounded
				x={column.x}
				y={innerHeight - barHeight}
				width={column.width}
				height={barHeight}
				radius={BAR_RADIUS}
				top
				className={cn('transition-[fill] duration-150', barClassOf(isActive, isOver, showsPart))}
			/>
			{drawsPart && (
				<BarRounded
					x={column.x}
					y={partTop}
					width={column.width}
					height={partHeight}
					radius={BAR_RADIUS}
					top={partIsWholeBar}
					className={cn('transition-[fill] duration-150', partClassOf(isActive))}
				/>
			)}
		</g>
	);
});

const TARGET_OVERHANG = 3;

/** The expected value of a slot: a short rule a little wider than the bar, so it reads over or under the bar. */
const TargetMark = memo(function TargetMark({
	datum,
	column,
	yScale,
	isActive
}: Readonly<{
	datum: DayBarDatum;
	column: ColumnGeometry | undefined;
	yScale: (value: number) => number;
	isActive: boolean;
}>) {
	if (!column || !hasTarget(datum)) {
		return null;
	}
	const y = yScale(datum.target ?? 0);
	const x1 = column.x - TARGET_OVERHANG;
	const x2 = column.x + column.width + TARGET_OVERHANG;
	return (
		<line
			x1={x1}
			x2={x2}
			y1={y}
			y2={y}
			strokeWidth={2}
			strokeLinecap="round"
			className={cn('transition-[stroke] duration-150', targetClassOf(isActive))}
		/>
	);
});

function targetClassOf(isActive: boolean) {
	if (isActive) {
		return 'stroke-foreground';
	}
	return 'stroke-foreground/55';
}
