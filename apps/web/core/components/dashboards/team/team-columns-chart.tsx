'use client';

import { type KeyboardEvent, type PointerEvent, memo, useCallback, useMemo, useState } from 'react';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarRounded, BarStack } from '@visx/shape';
import { TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import type { TimeAxis } from '@/core/lib/utils/dashboard-figures';
import { type ColumnStack, seriesValueOf } from '@/core/lib/utils/dashboards/team';

export interface ColumnDatum {
	key: string;
	label: string;
	axisLabel: string;
	stack: ColumnStack;
	total: number;
	memberCount: number;
	/** The slot's activity percentage, only when the slot holds active time (a web timer records none). */
	activity: number | null;
	isToday: boolean;
	isFuture: boolean;
}

export interface ColumnSeries {
	key: string;
	name: string;
	tone: string;
}

interface TeamColumnsChartProps {
	data: ReadonlyArray<ColumnDatum>;
	series: ReadonlyArray<ColumnSeries>;
	axis: TimeAxis;
	focusedKey: string | null;
	ariaLabel: string;
	totalLabel: string;
	emptySlotLabel: string;
	formatValue: (value: number) => string;
	formatTick: (value: number) => string;
	formatMembers: (count: number) => string;
	formatActivity: (percent: number) => string;
	limit?: number;
	limitLabel?: string;
	heightClassName?: string;
}

const MARGIN = { top: 10, right: 4, bottom: 24, left: 44 };
const SEGMENT_RADIUS = 4;
const MAX_COLUMN_WIDTH = 32;
const MIN_LABEL_SPACING = 40;
const ZERO_STUB_HEIGHT = 2;
const SEGMENT_GAP = 1;
const MIN_ROUNDED_HEIGHT = 2;
const BAND_PADDING_INNER = 0.3;
const BAND_PADDING_OUTER = 0.15;
const FADED_OPACITY = 0.22;

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

type BandScale = ReturnType<typeof scaleBand<string>>;

function clampIndex(index: number, count: number) {
	return Math.min(Math.max(index, 0), count - 1);
}

function lastPastIndexOf(data: ReadonlyArray<ColumnDatum>) {
	let index = data.length - 1;
	while (index > 0 && data[index]?.isFuture) {
		index -= 1;
	}
	return index;
}

function datumAt(data: ReadonlyArray<ColumnDatum>, index: number | null) {
	if (index === null) {
		return null;
	}
	return data[index] ?? null;
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

function axisLabelClassOf(datum: ColumnDatum) {
	if (datum.isToday) {
		return 'fill-primary-ink font-medium';
	}
	if (datum.isFuture) {
		return 'fill-muted-foreground/50';
	}
	return 'fill-muted-foreground';
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

interface LayerBounds {
	bottomIndex: number[];
	topIndex: number[];
}

function layerBoundsOf(data: ReadonlyArray<ColumnDatum>, seriesKeys: ReadonlyArray<string>): LayerBounds {
	const bottomIndex: number[] = [];
	const topIndex: number[] = [];
	for (const datum of data) {
		let bottom = -1;
		let top = -1;
		for (let layerIndex = 0; layerIndex < seriesKeys.length; layerIndex += 1) {
			const value = seriesValueOf(datum.stack, seriesKeys[layerIndex]);
			if (value <= 0) {
				continue;
			}
			if (bottom < 0) {
				bottom = layerIndex;
			}
			top = layerIndex;
		}
		bottomIndex.push(bottom);
		topIndex.push(top);
	}
	return { bottomIndex, topIndex };
}

function layerOpacityOf(seriesKey: string, focusedKey: string | null) {
	if (!focusedKey) {
		return 1;
	}
	if (seriesKey === focusedKey) {
		return 1;
	}
	return FADED_OPACITY;
}

function TooltipRows({
	datum,
	series,
	formatValue
}: Readonly<{
	datum: ColumnDatum;
	series: ReadonlyArray<ColumnSeries>;
	formatValue: (value: number) => string;
}>) {
	return (
		<>
			{series.map((entry) => {
				const value = seriesValueOf(datum.stack, entry.key);
				if (value <= 0) {
					return null;
				}
				return (
					<span
						key={entry.key}
						className="flex items-center justify-between gap-4 text-xs text-muted-foreground"
					>
						<span className="flex min-w-0 items-center gap-1.5">
							<span
								aria-hidden="true"
								className="size-2 shrink-0 rounded-[2px]"
								style={{ backgroundColor: entry.tone }}
							/>
							<span className="max-w-40 truncate">{entry.name}</span>
						</span>
						<span className="font-medium tabular-nums text-foreground">{formatValue(value)}</span>
					</span>
				);
			})}
		</>
	);
}

function tooltipFootOf(
	datum: ColumnDatum,
	formatMembers: (count: number) => string,
	formatActivity: (percent: number) => string
) {
	const parts: string[] = [];
	if (datum.memberCount > 0) {
		parts.push(formatMembers(datum.memberCount));
	}
	if (datum.activity !== null) {
		parts.push(formatActivity(datum.activity));
	}
	return parts.join(' · ');
}

function ColumnTooltip({
	datum,
	series,
	left,
	top,
	alignment,
	totalLabel,
	emptySlotLabel,
	formatValue,
	formatMembers,
	formatActivity
}: Readonly<{
	datum: ColumnDatum;
	series: ReadonlyArray<ColumnSeries>;
	left: number;
	top: number;
	alignment: string;
	totalLabel: string;
	emptySlotLabel: string;
	formatValue: (value: number) => string;
	formatMembers: (count: number) => string;
	formatActivity: (percent: number) => string;
}>) {
	const hasTime = datum.total > 0;
	const foot = tooltipFootOf(datum, formatMembers, formatActivity);
	return (
		<div
			className={cn('pointer-events-none absolute z-10 -translate-y-full pb-2', alignment)}
			style={{ left, top }}
		>
			<div className={cn(TOOLTIP_SURFACE, 'flex min-w-44 flex-col gap-1 px-2.5 py-2')}>
				<span className="whitespace-nowrap text-xs font-medium text-foreground">{datum.label}</span>
				{!hasTime && <span className="text-xs text-muted-foreground">{emptySlotLabel}</span>}
				{hasTime && (
					<>
						<TooltipRows datum={datum} series={series} formatValue={formatValue} />
						<span className="mt-0.5 flex items-center justify-between gap-4 pt-1 text-xs hairline-t border-border">
							<span className="text-muted-foreground">{totalLabel}</span>
							<span className="font-semibold tabular-nums text-foreground">
								{formatValue(datum.total)}
							</span>
						</span>
					</>
				)}
				{foot && <span className="text-[11px] text-muted-foreground">{foot}</span>}
			</div>
		</div>
	);
}

interface ColumnGeometry {
	x: number;
	width: number;
	centre: number;
}

function tooltipTargetOf(datum: ColumnDatum | null, column: ColumnGeometry | undefined) {
	if (!datum || !column) {
		return null;
	}
	if (datum.isFuture) {
		return null;
	}
	return { datum, column };
}

function columnAt(columns: ReadonlyArray<ColumnGeometry>, index: number | null) {
	if (index === null) {
		return undefined;
	}
	return columns[index];
}

function screenReaderSeriesTextOf(
	datum: ColumnDatum,
	series: ReadonlyArray<ColumnSeries>,
	formatValue: (value: number) => string
) {
	const parts: string[] = [];
	for (const entry of series) {
		const value = seriesValueOf(datum.stack, entry.key);
		if (value <= 0) {
			continue;
		}
		const formattedValue = formatValue(value);
		parts.push(`${entry.name} ${formattedValue}`);
	}
	return parts.join(', ');
}

export const TeamColumnsChart = memo(function TeamColumnsChart({
	data,
	series,
	axis,
	focusedKey,
	ariaLabel,
	totalLabel,
	emptySlotLabel,
	formatValue,
	formatTick,
	formatMembers,
	formatActivity,
	limit,
	limitLabel,
	heightClassName = 'h-56'
}: Readonly<TeamColumnsChartProps>) {
	const { parentRef, width, height } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const count = data.length;
	const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
	const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
	const isMeasured = innerWidth > 0 && innerHeight > 0;
	const hasLimit = typeof limit === 'number' && limit > 0;

	const stackData = useMemo(() => [...data], [data]);
	const seriesKeys = useMemo(() => series.map((entry) => entry.key), [series]);
	const toneByKey = useMemo(() => {
		const tones = new Map<string, string>();
		for (const entry of series) {
			tones.set(entry.key, entry.tone);
		}
		return tones;
	}, [series]);
	const bounds = useMemo(() => layerBoundsOf(data, seriesKeys), [data, seriesKeys]);

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
		const columnWidth = Math.min(bandWidth, MAX_COLUMN_WIDTH);
		return data.map((datum) => {
			const bandStart = xScale(datum.key) ?? 0;
			const centre = bandStart + bandWidth / 2;
			return { x: centre - columnWidth / 2, width: columnWidth, centre };
		});
	}, [data, xScale]);

	const labelStep = labelStepOf(count, innerWidth);
	const activeDatum = datumAt(data, activeIndex);
	const activeColumn = columnAt(columns, activeIndex);
	const activeKey = activeDatum?.key ?? '';
	const highlightX = slotStartOf(xScale, activeKey);
	const tooltipTarget = tooltipTargetOf(activeDatum, activeColumn);

	const valueOf = useCallback((datum: ColumnDatum, seriesKey: string) => seriesValueOf(datum.stack, seriesKey), []);
	const keyOf = useCallback((datum: ColumnDatum) => datum.key, []);
	const colorOf = useCallback((seriesKey: string) => toneByKey.get(seriesKey) ?? '', [toneByKey]);

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
	const activeTop = yScale(activeDatum?.total ?? 0);

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
								<EmptySlotStub
									key={datum.key}
									datum={datum}
									column={columns[index]}
									innerHeight={innerHeight}
								/>
							))}
							<BarStack<ColumnDatum, string>
								data={stackData}
								keys={seriesKeys}
								value={valueOf}
								x={keyOf}
								xScale={xScale}
								yScale={yScale}
								color={colorOf}
							>
								{(barStacks) =>
									barStacks.map((barStack) => (
										<g
											key={barStack.key}
											style={{ opacity: layerOpacityOf(barStack.key, focusedKey) }}
										>
											{barStack.bars.map((bar) => (
												<ColumnLayer
													key={`${barStack.key}:${bar.index}`}
													datum={data[bar.index]}
													column={columns[bar.index]}
													y={bar.y}
													height={bar.height}
													tone={bar.color}
													isBottom={bounds.bottomIndex[bar.index] === barStack.index}
													isTop={bounds.topIndex[bar.index] === barStack.index}
												/>
											))}
										</g>
									))
								}
							</BarStack>
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
				{tooltipTarget && (
					<ColumnTooltip
						datum={tooltipTarget.datum}
						series={series}
						left={MARGIN.left + tooltipTarget.column.centre}
						top={MARGIN.top + activeTop}
						alignment={tooltipAlignmentOf(tooltipTarget.column.centre, innerWidth)}
						totalLabel={totalLabel}
						emptySlotLabel={emptySlotLabel}
						formatValue={formatValue}
						formatMembers={formatMembers}
						formatActivity={formatActivity}
					/>
				)}
			</div>
			<table className="sr-only">
				<caption>{ariaLabel}</caption>
				<tbody>
					{data.map((datum) => (
						<tr key={datum.key}>
							<th scope="row">{datum.label}</th>
							<td>{formatValue(datum.total)}</td>
							<td>{screenReaderSeriesTextOf(datum, series, formatValue)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
});

const EmptySlotStub = memo(function EmptySlotStub({
	datum,
	column,
	innerHeight
}: Readonly<{ datum: ColumnDatum; column: ColumnGeometry | undefined; innerHeight: number }>) {
	if (!column) {
		return null;
	}
	const isWorked = datum.total > 0;
	if (datum.isFuture || isWorked) {
		return null;
	}
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
});

const ColumnLayer = memo(function ColumnLayer({
	datum,
	column,
	y,
	height,
	tone,
	isBottom,
	isTop
}: Readonly<{
	datum: ColumnDatum | undefined;
	column: ColumnGeometry | undefined;
	y: number;
	height: number;
	tone: string;
	isBottom: boolean;
	isTop: boolean;
}>) {
	if (!datum || !column) {
		return null;
	}
	if (datum.isFuture) {
		return null;
	}
	if (height <= 0) {
		return null;
	}
	let layerHeight = height;
	if (!isBottom) {
		layerHeight = Math.max(height - SEGMENT_GAP, 1);
	}
	const style = { fill: tone };
	const isRounded = isTop && layerHeight >= MIN_ROUNDED_HEIGHT;
	if (isRounded) {
		return (
			<BarRounded
				x={column.x}
				y={y}
				width={column.width}
				height={layerHeight}
				radius={SEGMENT_RADIUS}
				top
				style={style}
			/>
		);
	}
	return <rect x={column.x} y={y} width={column.width} height={layerHeight} style={style} />;
});
