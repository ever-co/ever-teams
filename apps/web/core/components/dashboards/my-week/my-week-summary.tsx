'use client';

import type { ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { LimitMeter, limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { DurationValue } from '@/core/components/dashboards/team/team-duration-value';
import { VERDICT_LABEL_KEYS } from '@/core/components/dashboards/weekly-limit/limit-cells';
import type { MyWeekPageState } from '@/core/hooks/dashboards/my-week/use-my-week-page';
import { cn } from '@/core/lib/helpers';
import {
	formatDurationShort,
	formatHoursLabel,
	formatPercent,
	type LimitVerdict
} from '@/core/lib/utils/dashboard-figures';
import type { MyWeekPeriodKey, MyWeekTarget } from '@/core/lib/utils/dashboards/my-week';
import { leftOf, limitShareLabelOf, overrunOf } from '@/core/lib/utils/dashboards/weekly-limit';
import { MyWeekDays } from './my-week-days';
import { MY_WEEK_FIGURE_PANE, MY_WEEK_SUMMARY_GRID } from './my-week-recipes';

type Translate = ReturnType<typeof useTranslations>;

const TRACKED_LABEL_KEYS: Record<MyWeekPeriodKey, DottedLanguageObjectStringPaths> = {
	thisWeek: 'dashboard.myWeek.TRACKED_THIS_WEEK',
	lastWeek: 'dashboard.myWeek.TRACKED_LAST_WEEK',
	thisMonth: 'dashboard.myWeek.TRACKED_THIS_MONTH'
};

const MAIN_FIGURE = 'text-3xl font-semibold leading-none tabular-nums text-foreground';

const NOTE = 'text-xs text-muted-foreground text-pretty';

const VERDICT_BADGES: Partial<Record<LimitVerdict, string>> = {
	near: 'bg-warning/10 text-warning-foreground',
	over: 'bg-destructive/10 text-destructive-ink'
};

/** Within the limit needs no badge: only a week close to its limit, or past it, is called out. */
function VerdictBadge({ verdict }: Readonly<{ verdict: LimitVerdict }>) {
	const t = useTranslations();
	const tone = VERDICT_BADGES[verdict];
	if (!tone) {
		return null;
	}
	return (
		<span className={cn('inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium', tone)}>
			{t(VERDICT_LABEL_KEYS[verdict])}
		</span>
	);
}

function remainingTextOf(target: MyWeekTarget, shownKey: MyWeekPeriodKey, t: Translate) {
	const overrun = overrunOf(target.remainingSeconds);
	if (overrun > 0) {
		const overrunText = formatDurationShort(overrun);
		return t('dashboard.myWeek.LIMIT_OVER', { duration: overrunText });
	}
	const left = leftOf(target.remainingSeconds);
	const duration = formatDurationShort(left);
	if (shownKey === 'thisWeek') {
		return t('dashboard.myWeek.LIMIT_LEFT', { duration });
	}
	return t('dashboard.myWeek.LIMIT_UNDER', { duration });
}

function TargetMeter({ target, shownKey }: Readonly<{ target: MyWeekTarget; shownKey: MyWeekPeriodKey }>) {
	const t = useTranslations();
	const percent = limitShareLabelOf(target.share, target.verdict);
	return (
		<div className="flex flex-col gap-2">
			<LimitMeter used={target.usedSeconds} limit={target.limitSeconds} className="h-3.5" />
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
				<span className={cn('font-medium', limitVerdictTextClassOf(target.verdict))}>
					{remainingTextOf(target, shownKey, t)}
				</span>
				<span className="tabular-nums text-muted-foreground">
					{t('dashboard.myWeek.LIMIT_SHARE', { percent })}
				</span>
			</div>
		</div>
	);
}

/** Why a figure stands without a meter: the member has no weekly limit, or the limit does not apply to a month. */
function targetNoteOf(shownKey: MyWeekPeriodKey, weeklyLimitSeconds: number | null, t: Translate) {
	if (weeklyLimitSeconds === null) {
		return t('dashboard.myWeek.NO_LIMIT');
	}
	if (shownKey === 'thisMonth') {
		const limit = formatHoursLabel(weeklyLimitSeconds);
		return t('dashboard.myWeek.LIMIT_BY_WEEK', { limit });
	}
	return null;
}

function readableFigureOf(trackedSeconds: number, target: MyWeekTarget | null, t: Translate) {
	const used = formatDurationShort(trackedSeconds);
	if (!target) {
		return used;
	}
	const limit = formatHoursLabel(target.limitSeconds);
	return t('dashboard.weeklyLimit.CELL_USED_OF', { used, limit });
}

function WeekFigure({ page }: Readonly<{ page: MyWeekPageState }>) {
	const t = useTranslations();
	const { shownKey, target, weeklyLimitSeconds } = page;
	const trackedSeconds = page.figures.trackedSeconds;
	const note = targetNoteOf(shownKey, weeklyLimitSeconds, t);
	const showsNote = !target && Boolean(note);
	let limitText = '';
	if (target) {
		limitText = formatHoursLabel(target.limitSeconds);
	}
	return (
		<div className="flex flex-col gap-3">
			<div className="flex min-h-5 items-center justify-between gap-2">
				<h2 className="truncate text-xs text-muted-foreground">{t(TRACKED_LABEL_KEYS[shownKey])}</h2>
				{target && <VerdictBadge verdict={target.verdict} />}
			</div>
			<p className={MAIN_FIGURE}>
				<span className="sr-only">{readableFigureOf(trackedSeconds, target, t)}</span>
				<span aria-hidden="true">
					<DurationValue seconds={trackedSeconds} />
					{target && <span className="text-base font-normal text-muted-foreground">{` / ${limitText}`}</span>}
				</span>
			</p>
			{target && <TargetMeter target={target} shownKey={shownKey} />}
			{showsNote && <p className={NOTE}>{note}</p>}
		</div>
	);
}

function SupportingFigure({ label, value, hint }: Readonly<{ label: string; value: ReactNode; hint?: string | null }>) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="truncate text-xs text-muted-foreground">{label}</dt>
			<dd className="truncate text-lg font-semibold leading-tight tabular-nums text-foreground">{value}</dd>
			{hint && <dd className="truncate text-xs tabular-nums text-muted-foreground">{hint}</dd>}
		</div>
	);
}

function SupportingFigures({ page }: Readonly<{ page: MyWeekPageState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { todaySeconds, billableShare, billableSeconds } = page.figures;
	const showsToday = todaySeconds !== null;
	const showsBillable = billableShare !== null;
	if (!showsToday && !showsBillable) {
		return null;
	}
	return (
		<dl className="grid grid-cols-2 gap-x-6 gap-y-4">
			{showsToday && <SupportingFigure label={t('common.TODAY')} value={formatDurationShort(todaySeconds)} />}
			{showsBillable && (
				<SupportingFigure
					label={t('dashboard.timesheets.BILLABLE')}
					value={formatPercent(billableShare, locale)}
					hint={formatDurationShort(billableSeconds)}
				/>
			)}
		</dl>
	);
}

/** One surface in two panes: the figure pane is set apart from the days by its tint, never by a line. */
export function MyWeekSummary({ page }: Readonly<{ page: MyWeekPageState }>) {
	const t = useTranslations();
	return (
		<section
			aria-label={t('dashboard.myWeek.SUMMARY_LABEL')}
			className={cn(DASHBOARD_SURFACE, MY_WEEK_SUMMARY_GRID)}
		>
			<div className={cn(MY_WEEK_FIGURE_PANE, 'bg-foreground/[0.03]')}>
				<WeekFigure page={page} />
				<SupportingFigures page={page} />
			</div>
			<MyWeekDays days={page.days} dailyLimitSeconds={page.dailyLimitSeconds} shownKey={page.shownKey} />
		</section>
	);
}
