'use client';

import { memo, useMemo } from 'react';
import { useParentSize } from '@visx/responsive';
import { useLocale } from 'next-intl';
import { cn } from '@/core/lib/helpers';

/** The hours a day strip spans and where the present moment sits on it, in percent, when the day is today. */
export interface HourWindow {
	hours: ReadonlyArray<number>;
	nowPercent: number | null;
}

const DENSE_AXIS_HOURS = 12;

/** Rendered widths in pixels at 11px, a little generous, so an hour label the now pill would cover is hidden. */
const NOW_PILL_WIDTH = 64;

const HOUR_LABEL_WIDTH = 36;

const AXIS_GAP = 6;

type AxisAlign = 'start' | 'center' | 'end';

interface AxisSpan {
	start: number;
	end: number;
}

const ALIGN_SHIFT: Record<AxisAlign, string> = {
	start: 'translate-x-0',
	center: '-translate-x-1/2',
	end: '-translate-x-full'
};

/** The first and last hour labels sit inside the axis instead of overflowing it. */
function hourLabelAlignOf(index: number, hourCount: number): AxisAlign {
	if (index === 0) {
		return 'start';
	}
	const isLast = index === hourCount - 1;
	if (isLast) {
		return 'end';
	}
	return 'center';
}

/** The pill stays inside the axis at both ends instead of overflowing it. */
function nowPillAlignOf(percent: number): AxisAlign {
	if (percent > 90) {
		return 'end';
	}
	if (percent < 10) {
		return 'start';
	}
	return 'center';
}

function axisSpanOf(anchor: number, width: number, align: AxisAlign): AxisSpan {
	if (align === 'start') {
		return { start: anchor, end: anchor + width };
	}
	if (align === 'end') {
		return { start: anchor - width, end: anchor };
	}
	const half = width / 2;
	return { start: anchor - half, end: anchor + half };
}

function spansOverlap(first: AxisSpan, second: AxisSpan) {
	const isFirstBefore = first.end + AXIS_GAP <= second.start;
	const isSecondBefore = second.end + AXIS_GAP <= first.start;
	return !isFirstBefore && !isSecondBefore;
}

function nowPillSpanOf(nowPercent: number, axisWidth: number) {
	const ratio = nowPercent / 100;
	const anchor = ratio * axisWidth;
	const align = nowPillAlignOf(nowPercent);
	return axisSpanOf(anchor, NOW_PILL_WIDTH, align);
}

function isCoveredByPill(percent: number, align: AxisAlign, pillSpan: AxisSpan | null, axisWidth: number) {
	if (!pillSpan) {
		return false;
	}
	const ratio = percent / 100;
	const anchor = ratio * axisWidth;
	const labelSpan = axisSpanOf(anchor, HOUR_LABEL_WIDTH, align);
	return spansOverlap(labelSpan, pillSpan);
}

function hourLabelOf(hour: number, hourFormat: Intl.DateTimeFormat) {
	const date = new Date();
	date.setHours(hour, 0, 0, 0);
	return hourFormat.format(date);
}

function hourLabelStepOf(hourCount: number) {
	const isDense = hourCount > DENSE_AXIS_HOURS;
	if (isDense) {
		return 2;
	}
	return 1;
}

function narrowLabelStepOf(hourCount: number) {
	return hourLabelStepOf(hourCount) * 2;
}

/** A compact axis (the member sheet) always keeps the narrow spacing, whatever the screen. */
function isLabelledHour(index: number, hourCount: number, isCompact: boolean) {
	let step = hourLabelStepOf(hourCount);
	if (isCompact) {
		step = narrowLabelStepOf(hourCount);
	}
	return index % step === 0;
}

/** Phones keep every other label of the desktop axis, or the hours run into each other. */
function hourLabelVisibilityOf(index: number, hourCount: number) {
	const narrowStep = narrowLabelStepOf(hourCount);
	const isOnPhone = index % narrowStep === 0;
	if (isOnPhone) {
		return '';
	}
	return 'max-sm:hidden';
}

function hourPercentOf(index: number, hourCount: number) {
	const steps = Math.max(hourCount - 1, 1);
	const ratio = index / steps;
	return ratio * 100;
}

export const HourAxis = memo(function HourAxis({
	timeline,
	nowLabel,
	isCompact = false
}: Readonly<{ timeline: HourWindow; nowLabel: string | null; isCompact?: boolean }>) {
	const locale = useLocale();
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric' }), [locale]);
	const { parentRef, width } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const hourCount = timeline.hours.length;
	const nowPercent = timeline.nowPercent ?? 0;
	const hasNow = timeline.nowPercent !== null;
	const showsNowPill = hasNow && Boolean(nowLabel);
	const isMeasured = width > 0;
	const checksCollisions = showsNowPill && isMeasured;
	const pillAlign = nowPillAlignOf(nowPercent);
	let pillSpan: AxisSpan | null = null;
	if (checksCollisions) {
		pillSpan = nowPillSpanOf(nowPercent, width);
	}
	return (
		<div ref={parentRef} aria-hidden="true" className="relative h-5">
			{timeline.hours.map((hour, index) => {
				const isLabelled = isLabelledHour(index, hourCount, isCompact);
				if (!isLabelled) {
					return null;
				}
				const percent = hourPercentOf(index, hourCount);
				const align = hourLabelAlignOf(index, hourCount);
				const isCovered = isCoveredByPill(percent, align, pillSpan, width);
				if (isCovered) {
					return null;
				}
				const left = `${percent}%`;
				return (
					<span
						key={hour}
						style={{ left }}
						className={cn(
							'absolute top-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground',
							ALIGN_SHIFT[align],
							hourLabelVisibilityOf(index, hourCount)
						)}
					>
						{hourLabelOf(hour, hourFormat)}
					</span>
				);
			})}
			{showsNowPill && (
				<span
					style={{ left: `${nowPercent}%` }}
					className={cn(
						'absolute top-0 z-[1] whitespace-nowrap rounded-full bg-destructive px-1.5 text-[11px] font-medium leading-5 tabular-nums text-white',
						ALIGN_SHIFT[pillAlign]
					)}
				>
					{nowLabel}
				</span>
			)}
		</div>
	);
});
