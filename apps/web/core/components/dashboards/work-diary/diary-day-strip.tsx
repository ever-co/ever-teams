'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { hasLongStripOf, shiftedDiaryWeekOf } from '@/core/lib/utils/dashboards/work-diary';

const STRIP_SKELETON_DAYS = 7;
const STRIP_SKELETON_DAY_KEYS = Array.from({ length: STRIP_SKELETON_DAYS }, (_, index) => `day-${index}`);

/**
 * The days a work diary can open, each with a mark when time was tracked on it; days after today are disabled. Over a
 * period longer than two weeks the strip shows one week and steps week by week, inside the period.
 */
export function DiaryDayStrip({
	days,
	day,
	trackedKeys,
	period,
	onPick
}: Readonly<{
	days: ReadonlyArray<Date>;
	day: Date;
	trackedKeys: ReadonlySet<string>;
	period: Period;
	onPick: (day: Date) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const weekdayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
	const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric' }), [locale]);
	const longFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
		[locale]
	);
	const pickedKey = localDayKeyOf(day);
	const todayKey = localDayKeyOf(new Date());
	const isLong = hasLongStripOf(period);
	const firstKey = localDayKeyOf(period.from);
	const lastKey = localDayKeyOf(period.to);
	const firstShownKey = localDayKeyOf(days[0] ?? day);
	const lastShownKey = localDayKeyOf(days.at(-1) ?? day);
	const canGoBack = firstShownKey > firstKey;
	const canGoForward = lastShownKey < lastKey;
	return (
		<div className="flex min-w-0 items-center gap-1">
			{isLong && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={!canGoBack}
					onClick={() => onPick(shiftedDiaryWeekOf(day, -1, period))}
					aria-label={t('dashboard.timesheets.diary.PREVIOUS_WEEK')}
				>
					<ChevronLeft aria-hidden="true" />
				</Button>
			)}
			<ol
				aria-label={t('dashboard.timesheets.diary.DAY_STRIP')}
				className="flex flex-wrap items-stretch gap-0.5 sm:gap-1"
			>
				{days.map((item) => {
					const key = localDayKeyOf(item);
					const isPicked = key === pickedKey;
					const isTracked = trackedKeys.has(key);
					const isAhead = key > todayKey;
					const longLabel = longFormat.format(item);
					const showsTrackedMark = isTracked && !isPicked;
					let label = t('dashboard.timesheets.diary.DAY_NO_TIME', { day: longLabel });
					if (isTracked) {
						label = t('dashboard.timesheets.diary.DAY_TRACKED', { day: longLabel });
					}
					return (
						<li key={key}>
							<button
								type="button"
								aria-pressed={isPicked}
								aria-label={label}
								disabled={isAhead}
								onClick={() => onPick(item)}
								className={cn(
									'flex w-10 flex-col items-center gap-0.5 rounded-md pt-1.5 pb-1 outline-none sm:w-11 transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50',
									isPicked && 'bg-foreground/[0.05] text-foreground',
									!isPicked && 'text-muted-foreground'
								)}
							>
								<span className="text-[11px] capitalize">{weekdayFormat.format(item)}</span>
								<span className="text-[13px] font-medium tabular-nums">{dateFormat.format(item)}</span>
								<span
									aria-hidden="true"
									className={cn(
										'mt-0.5 h-0.5 w-4 rounded-full',
										isPicked && 'bg-primary',
										showsTrackedMark && 'bg-success/70'
									)}
								/>
							</button>
						</li>
					);
				})}
			</ol>
			{isLong && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={!canGoForward}
					onClick={() => onPick(shiftedDiaryWeekOf(day, 1, period))}
					aria-label={t('dashboard.timesheets.diary.NEXT_WEEK')}
				>
					<ChevronRight aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}

/** The strip's place while the diary loads: a week of day buttons. */
export function DiaryDayStripSkeleton() {
	return (
		<div aria-hidden="true" className="flex gap-1">
			{STRIP_SKELETON_DAY_KEYS.map((slotKey) => (
				<span key={slotKey} className="h-12 w-11 animate-pulse rounded-md bg-foreground/[0.04]" />
			))}
		</div>
	);
}
