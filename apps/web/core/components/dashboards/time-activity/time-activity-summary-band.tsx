'use client';

import { type ReactNode, memo, useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { ActivityMeter } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { useTimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import type {
	TimeActivityFigures,
	TimeActivityReport
} from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { cn } from '@/core/lib/helpers';
import {
	type ActivityBand,
	activityBandOf,
	formatDurationShort,
	formatPercent
} from '@/core/lib/utils/dashboard-figures';
import { formatAmounts } from '@/core/lib/utils/daily-report-figures';
import { recordedActivityOf } from '@/core/lib/utils/dashboards/time-activity';
import { TimeActivityExportMenu } from './time-activity-export-menu';

const MISSING_VALUE = '–';

const BAND =
	'm-2 grid grid-cols-1 gap-2 rounded-lg bg-foreground/[0.03] py-2 ps-3 pe-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center';

const FIGURES = 'grid grid-cols-2 gap-x-4 gap-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6';

const FIGURE = 'flex min-h-8 min-w-0 items-center gap-1.5';

const BAND_LABEL_KEYS: Record<ActivityBand, DottedLanguageObjectStringPaths> = {
	low: 'dashboard.timeActivity.figures.ACTIVITY_LOW',
	medium: 'dashboard.timeActivity.figures.ACTIVITY_MEDIUM',
	high: 'dashboard.timeActivity.figures.ACTIVITY_HIGH'
};

type Translate = ReturnType<typeof useTranslations>;

interface BandFigure {
	key: string;
	label: string;
	value: ReactNode;
	/** What the figure is made of, or why it is missing: read on hover and by screen readers. */
	hint?: string;
	/** A second reading of the same figure, written muted beside its value. */
	note?: string | null;
}

function MissingValue({ reason }: Readonly<{ reason: string }>) {
	return (
		<>
			<span aria-hidden="true">{MISSING_VALUE}</span>
			<span className="sr-only">{reason}</span>
		</>
	);
}

/**
 * Gauzy's counts hold timer logs only, while the daily report behind the chart and the breakdown holds every log
 * type: the band shows the report's total so the page agrees with itself, and the timer's when it differs.
 */
function timerNoteOf(figures: TimeActivityFigures, reportText: string, t: Translate) {
	const timerSeconds = figures.trackedSeconds;
	if (timerSeconds === null) {
		return null;
	}
	const timerText = formatDurationShort(timerSeconds);
	const isSameReading = timerText === reportText;
	if (isSameReading) {
		return null;
	}
	return t('dashboard.timeActivity.sheet.BY_TIMER', { duration: timerText });
}

function totalFigureOf(figures: TimeActivityFigures, t: Translate): BandFigure {
	const label = t('dashboard.timeActivity.figures.TRACKED');
	if (figures.reportSeconds === null) {
		const reason = t('dashboard.timeActivity.figures.UNAVAILABLE');
		return { key: 'total', label, value: <MissingValue reason={reason} />, hint: reason };
	}
	const reportText = formatDurationShort(figures.reportSeconds);
	return {
		key: 'total',
		label,
		value: reportText,
		note: timerNoteOf(figures, reportText, t),
		hint: t('dashboard.timeActivity.figures.TRACKED_DAYS', { count: figures.totals.dayCount })
	};
}

function missingActivityReasonOf(figures: TimeActivityFigures, t: Translate) {
	if (figures.activityPercent === null) {
		return t('dashboard.timeActivity.figures.UNAVAILABLE');
	}
	const trackedSeconds = figures.trackedSeconds ?? 0;
	const hasTime = trackedSeconds > 0;
	if (!hasTime) {
		return t('dashboard.timeActivity.figures.NO_TIME');
	}
	return t('dashboard.timeActivity.sheet.NO_ACTIVITY');
}

function activityFigureOf(figures: TimeActivityFigures, locale: string, t: Translate): BandFigure {
	const label = t('dashboard.timeActivity.columns.ACTIVITY');
	const percent = recordedActivityOf(figures.activityPercent, figures.trackedSeconds);
	if (percent === null) {
		const reason = missingActivityReasonOf(figures, t);
		return { key: 'activity', label, value: <MissingValue reason={reason} />, hint: reason };
	}
	const rounded = Math.round(percent);
	const band = activityBandOf(rounded);
	return {
		key: 'activity',
		label,
		value: (
			<span className="inline-flex items-center gap-2">
				<span>{formatPercent(rounded, locale)}</span>
				<ActivityMeter percent={rounded} />
			</span>
		),
		hint: t(BAND_LABEL_KEYS[band])
	};
}

function earningsHintOf(figures: TimeActivityFigures, t: Translate) {
	const { totals } = figures;
	const hasTime = totals.seconds > 0;
	if (!hasTime) {
		return t('dashboard.timeActivity.figures.NO_TIME');
	}
	const hasEarnings = totals.earnings.length > 0;
	if (!hasEarnings) {
		return t('dashboard.timeActivity.figures.EARNINGS_NO_RATES');
	}
	const hasMissingRates = totals.membersWithoutRate > 0;
	if (hasMissingRates) {
		return t('dashboard.timeActivity.figures.EARNINGS_MISSING_RATES', { count: totals.membersWithoutRate });
	}
	return t('dashboard.timeActivity.figures.EARNINGS_FROM_RATES');
}

function earningsFigureOf(figures: TimeActivityFigures, locale: string, t: Translate): BandFigure {
	const label = t('dashboard.timeActivity.columns.EARNINGS');
	const hint = earningsHintOf(figures, t);
	const amounts = figures.totals.earnings;
	const hasEarnings = amounts.length > 0;
	if (!hasEarnings) {
		return { key: 'earnings', label, value: <MissingValue reason={hint} />, hint };
	}
	const text = formatAmounts(amounts, locale);
	return { key: 'earnings', label, value: <span className="truncate">{text}</span>, hint };
}

function membersFigureOf(figures: TimeActivityFigures, t: Translate): BandFigure {
	const { totals } = figures;
	return {
		key: 'members',
		label: t('dashboard.timeActivity.figures.MEMBERS'),
		value: totals.memberCount,
		hint: t('dashboard.timeActivity.figures.MEMBERS_PROJECTS', { count: totals.projectCount })
	};
}

function bandFiguresOf(figures: TimeActivityFigures, isManager: boolean, locale: string, t: Translate) {
	const total = totalFigureOf(figures, t);
	const activity = activityFigureOf(figures, locale, t);
	const list: BandFigure[] = [total, activity];
	if (isManager) {
		const earnings = earningsFigureOf(figures, locale, t);
		list.push(earnings);
	}
	const members = membersFigureOf(figures, t);
	list.push(members);
	return list;
}

function labelFiguresOf(isManager: boolean, t: Translate): BandFigure[] {
	const list: BandFigure[] = [
		{ key: 'total', label: t('dashboard.timeActivity.figures.TRACKED'), value: null },
		{ key: 'activity', label: t('dashboard.timeActivity.columns.ACTIVITY'), value: null }
	];
	if (isManager) {
		list.push({ key: 'earnings', label: t('dashboard.timeActivity.columns.EARNINGS'), value: null });
	}
	list.push({ key: 'members', label: t('dashboard.timeActivity.figures.MEMBERS'), value: null });
	return list;
}

const FigureItem = memo(function FigureItem({
	figure,
	isLoading
}: Readonly<{ figure: BandFigure; isLoading: boolean }>) {
	return (
		<div className={FIGURE} title={figure.hint}>
			<dt className="shrink-0 text-xs text-muted-foreground">{figure.label}</dt>
			{isLoading && <dd className={cn('h-2.5 w-12', SKELETON_BAR)} />}
			{!isLoading && (
				<dd className="flex min-w-0 items-baseline gap-1.5 text-[13px] font-semibold tabular-nums text-foreground">
					{figure.value}
					{figure.note && (
						<span className="truncate text-xs font-normal text-muted-foreground">{figure.note}</span>
					)}
				</dd>
			)}
		</div>
	);
});

function BandFrame({
	figures,
	isLoading,
	actions
}: Readonly<{ figures: ReadonlyArray<BandFigure>; isLoading: boolean; actions: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className={BAND}>
			<h2 className="sr-only">{t('dashboard.timeActivity.sheet.SUMMARY')}</h2>
			<dl className={FIGURES}>
				{figures.map((figure) => (
					<FigureItem key={figure.key} figure={figure} isLoading={isLoading} />
				))}
			</dl>
			<div className="flex justify-end">{actions}</div>
		</div>
	);
}

/** A figure the API did not give reads "–" and says why on hover and to screen readers. */
export function TimeActivitySummaryBand({
	figures,
	isManager,
	isLoading,
	actions
}: Readonly<{ figures: TimeActivityFigures; isManager: boolean; isLoading: boolean; actions: ReactNode }>) {
	const t = useTranslations();
	const locale = useLocale();
	const items = useMemo(() => bandFiguresOf(figures, isManager, locale, t), [figures, isManager, locale, t]);
	return <BandFrame figures={items} isLoading={isLoading} actions={actions} />;
}

const EXPORT_SKELETON = 'h-8 w-29.25 animate-pulse rounded-full bg-foreground/[0.06]';

export function TimeActivitySummaryBandSkeleton({ isManager = true }: Readonly<{ isManager?: boolean }>) {
	const t = useTranslations();
	const items = useMemo(() => labelFiguresOf(isManager, t), [isManager, t]);
	return <BandFrame figures={items} isLoading actions={<span aria-hidden="true" className={EXPORT_SKELETON} />} />;
}

/** The filter names are read here, so a team refresh re-renders the export button and not the band. */
export function TimeActivityBandExport({ report }: Readonly<{ report: TimeActivityReport }>) {
	const filterOptions = useTimeActivityFilterOptions();
	const hasRows = report.rows.length > 0;
	return (
		<TimeActivityExportMenu
			report={report.report}
			period={report.period}
			grouping={report.breakdownGrouping}
			clientOf={report.clientOfProjectLog}
			isManager={report.isManager}
			ownEmployeeId={report.ownEmployeeId}
			figures={report.figures}
			filters={report.settings.filters}
			filterOptions={filterOptions}
			isDisabled={!hasRows}
		/>
	);
}
