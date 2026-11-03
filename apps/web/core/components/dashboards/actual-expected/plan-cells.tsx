'use client';

import type { CSSProperties, ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import {
	dayLabelPartsOf,
	differenceOf,
	relativeDayOf,
	wholePercentOf,
	type ExpectedSource,
	type MemberDay,
	type PlanTotals,
	type RelativeDay
} from '@/core/lib/utils/dashboards/actual-expected';

const MISSING_FIGURE = '–';

const FIGURE_TEXT = 'truncate text-right text-[13px] tabular-nums';

const TRACK = 'hsl(var(--foreground) / 0.1)';
const PRIMARY = 'hsl(var(--primary))';
const WARNING = 'hsl(var(--warning))';

/** The kit's meters do not export their tick mask, so the plan meter draws its own with the same values. */
function tickMaskOf(tickWidth: number, gap: number): CSSProperties {
	const pattern = `repeating-linear-gradient(to right, #000 0 ${tickWidth}px, transparent ${tickWidth}px ${tickWidth + gap}px)`;
	return { maskImage: pattern, WebkitMaskImage: pattern };
}

/** Past the plan the scale grows and the extra ticks take the warning tone: working more is not a fault. */
export function PlanMeter({
	actual,
	expected,
	className
}: Readonly<{ actual: number; expected: number; className?: string }>) {
	const scale = Math.max(expected, actual, 1);
	const reached = Math.min(actual, expected);
	const withinEnd = (reached / scale) * 100;
	const actualEnd = (actual / scale) * 100;
	const background = `linear-gradient(to right, ${PRIMARY} 0 ${withinEnd}%, ${WARNING} ${withinEnd}% ${actualEnd}%, ${TRACK} ${actualEnd}% 100%)`;
	return (
		<span
			aria-hidden="true"
			className={cn('block h-3 w-full min-w-16 rounded-[2px]', className)}
			style={{ background, ...tickMaskOf(3, 2) }}
		/>
	);
}

export interface PlanFigure {
	expected: number | null;
	actual: number;
}

export function figureOfDay(memberDay: MemberDay): PlanFigure {
	return { expected: memberDay.expected, actual: memberDay.actual };
}

export function figureOfTotals(totals: PlanTotals): PlanFigure {
	if (!totals.hasExpected) {
		return { expected: null, actual: totals.actual };
	}
	return { expected: totals.expected, actual: totals.actual };
}

function expectedTextOf(expected: number | null) {
	if (expected === null) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(expected);
}

function percentTextOf(figure: PlanFigure) {
	const expected = figure.expected;
	if (expected === null) {
		return MISSING_FIGURE;
	}
	if (expected <= 0) {
		return MISSING_FIGURE;
	}
	const share = (figure.actual / expected) * 100;
	return `${wholePercentOf(share)}%`;
}

export function ReachedValue({ figure, className }: Readonly<{ figure: PlanFigure; className?: string }>) {
	const expectedText = expectedTextOf(figure.expected);
	return (
		<span className={cn(FIGURE_TEXT, className)}>
			<span className="text-foreground">{formatDurationShort(figure.actual)}</span>
			<span className="text-muted-foreground">{` / ${expectedText}`}</span>
		</span>
	);
}

/** Phones carry "6h 10m / 8h" on the row's first line, so the meter cell shows it from md only. */
export function ReachedCell({ figure, className }: Readonly<{ figure: PlanFigure; className?: string }>) {
	const expected = figure.expected ?? 0;
	const hasExpected = expected > 0;
	return (
		<span className={cn('flex min-w-0 items-center gap-3', className)}>
			{hasExpected && <PlanMeter actual={figure.actual} expected={expected} className="min-w-0 flex-1" />}
			{!hasExpected && (
				<span aria-hidden="true" className="block h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/6" />
			)}
			<ReachedValue figure={figure} className="shrink-0 max-md:hidden" />
			<span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-foreground">
				{percentTextOf(figure)}
			</span>
		</span>
	);
}

export function DifferenceValue({ figure, className }: Readonly<{ figure: PlanFigure; className?: string }>) {
	const t = useTranslations();
	const difference = differenceOf(figure.expected, figure.actual);
	if (difference === null) {
		return <span className={cn(FIGURE_TEXT, 'text-muted-foreground', className)}>{MISSING_FIGURE}</span>;
	}
	if (difference > 0) {
		return (
			<span className={cn(FIGURE_TEXT, 'text-foreground', className)}>
				{t('dashboard.actualExpected.DIFFERENCE_OVER', { duration: formatHoursLabel(difference) })}
			</span>
		);
	}
	if (difference < 0) {
		return (
			<span className={cn(FIGURE_TEXT, 'text-warning-foreground', className)}>
				{t('dashboard.actualExpected.DIFFERENCE_UNDER', { duration: formatHoursLabel(-difference) })}
			</span>
		);
	}
	return (
		<span className={cn(FIGURE_TEXT, 'text-muted-foreground', className)}>
			{t('dashboard.actualExpected.ON_PLAN')}
		</span>
	);
}

export function ActualValue({ actual, className }: Readonly<{ actual: number; className?: string }>) {
	return <span className={cn(FIGURE_TEXT, 'text-foreground', className)}>{formatDurationShort(actual)}</span>;
}

export const SOURCE_LABEL_KEYS: Record<ExpectedSource, DottedLanguageObjectStringPaths> = {
	planned: 'dashboard.actualExpected.SOURCE_PLANNED',
	estimates: 'dashboard.actualExpected.FROM_ESTIMATES',
	withoutTime: 'dashboard.actualExpected.PLAN_WITHOUT_TIME',
	noPlan: 'dashboard.actualExpected.NO_PLAN'
};

function ExpectedNote({ memberDay }: Readonly<{ memberDay: MemberDay }>) {
	const t = useTranslations();
	if (memberDay.source === 'estimates') {
		return (
			<span className="truncate text-xs text-muted-foreground">
				{t('dashboard.actualExpected.FROM_ESTIMATES')}
			</span>
		);
	}
	const taskEstimates = memberDay.taskEstimates;
	if (taskEstimates === null) {
		return null;
	}
	return (
		<span className="truncate text-xs tabular-nums text-muted-foreground">
			{t('dashboard.actualExpected.TASK_ESTIMATES_LINE', { duration: formatHoursLabel(taskEstimates) })}
		</span>
	);
}

export function DayExpectedValue({ memberDay, className }: Readonly<{ memberDay: MemberDay; className?: string }>) {
	const t = useTranslations();
	const expected = memberDay.expected;
	if (expected === null) {
		return (
			<span className={cn('truncate text-right text-[13px] text-muted-foreground', className)}>
				{t(SOURCE_LABEL_KEYS[memberDay.source])}
			</span>
		);
	}
	return (
		<span className={cn('flex min-w-0 flex-col items-end', className)}>
			<span className={cn(FIGURE_TEXT, 'max-w-full text-foreground')}>{formatHoursLabel(expected)}</span>
			<ExpectedNote memberDay={memberDay} />
		</span>
	);
}

function missingExpectedKeyOf(totals: PlanTotals): DottedLanguageObjectStringPaths {
	if (totals.withoutTimeDays > 0) {
		return 'dashboard.actualExpected.PLAN_WITHOUT_TIME';
	}
	return 'dashboard.actualExpected.NO_PLAN';
}

export function TotalExpectedValue({ totals, className }: Readonly<{ totals: PlanTotals; className?: string }>) {
	const t = useTranslations();
	if (!totals.hasExpected) {
		return (
			<span className={cn('truncate text-right text-[13px] text-muted-foreground', className)}>
				{t(missingExpectedKeyOf(totals))}
			</span>
		);
	}
	return <span className={cn(FIGURE_TEXT, 'text-foreground', className)}>{formatHoursLabel(totals.expected)}</span>;
}

function countToneOf(count: number) {
	if (count > 0) {
		return 'text-foreground';
	}
	return 'text-muted-foreground';
}

export function UnplannedDaysValue({ count, className }: Readonly<{ count: number; className?: string }>) {
	const tone = countToneOf(count);
	return <span className={cn(FIGURE_TEXT, tone, className)}>{count}</span>;
}

const RELATIVE_DAY_KEYS: Record<NonNullable<RelativeDay>, DottedLanguageObjectStringPaths> = {
	today: 'common.TODAY',
	yesterday: 'common.YESTERDAY'
};

function leadWordOf(relative: RelativeDay, weekday: string, t: ReturnType<typeof useTranslations>) {
	if (relative) {
		return t(RELATIVE_DAY_KEYS[relative]);
	}
	return weekday;
}

function boldLead(chunks: ReactNode) {
	return <span className="font-semibold">{chunks}</span>;
}

/** "Today" and "Yesterday" take the weekday's place for the two latest days. */
export function DayLabel({ day, dayKey, className }: Readonly<{ day: Date; dayKey: string; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { weekday, date } = dayLabelPartsOf(day, locale);
	const relative = relativeDayOf(dayKey);
	const leadWord = leadWordOf(relative, weekday, t);
	return (
		<span className={cn('truncate text-[13px] text-foreground', className)}>
			{t.rich('dashboard.actualExpected.DAY_LABEL', {
				weekday: leadWord,
				date,
				lead: boldLead
			})}
		</span>
	);
}

function lastInitialOf(words: string[]) {
	if (words.length < 2) {
		return '';
	}
	const lastWord = words.at(-1);
	return lastWord?.[0] ?? '';
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = lastInitialOf(words);
	return `${first}${last}`.toUpperCase();
}

export function MemberFace({ name, imageUrl }: Readonly<{ name: string; imageUrl: string | null }>) {
	return (
		<Avatar className="size-4">
			<AvatarImage src={imageUrl ?? undefined} alt="" />
			<AvatarFallback className="text-[7px] font-medium">{initialsOf(name)}</AvatarFallback>
		</Avatar>
	);
}
