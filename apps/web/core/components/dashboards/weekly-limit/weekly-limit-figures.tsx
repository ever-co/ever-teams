'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { MetricStrip, type MetricItem, type MetricTone } from '@/core/components/dashboards/kit/metric-strip';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { formatDurationShort, formatHoursLabel, type LimitVerdict } from '@/core/lib/utils/dashboard-figures';
import {
	limitShareLabelOf,
	type LimitDuration,
	type LimitFigures,
	type LimitTotals
} from '@/core/lib/utils/dashboards/weekly-limit';

type FigureKey = 'over' | 'near' | 'tracked' | 'used';

const MISSING_FIGURE = '–';

const OVER_LABEL_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.DAYS_OVER',
	week: 'dashboard.weeklyLimit.WEEKS_OVER'
};

const NEAR_LABEL_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.DAYS_NEAR',
	week: 'dashboard.weeklyLimit.WEEKS_NEAR'
};

const VERDICT_TONES: Record<LimitVerdict, MetricTone> = {
	within: 'default',
	near: 'warning',
	over: 'destructive'
};

function toneWhenAny(count: number, tone: MetricTone): MetricTone {
	if (count > 0) {
		return tone;
	}
	return 'default';
}

function shareValueOf(totals: LimitTotals) {
	if (!totals.hasLimit) {
		return MISSING_FIGURE;
	}
	return limitShareLabelOf(totals.share, totals.verdict);
}

function shareToneOf(totals: LimitTotals): MetricTone {
	if (!totals.hasLimit) {
		return 'default';
	}
	return VERDICT_TONES[totals.verdict];
}

function figureItemsOf(
	figures: LimitFigures | null,
	duration: LimitDuration,
	t: ReturnType<typeof useTranslations>
): MetricItem<FigureKey>[] {
	const overLabel = t(OVER_LABEL_KEYS[duration]);
	const nearLabel = t(NEAR_LABEL_KEYS[duration]);
	const trackedLabel = t('dashboard.weeklyLimit.TRACKED');
	const usedLabel = t('dashboard.weeklyLimit.LIMIT_USED');
	if (!figures) {
		return [
			{ key: 'over', label: overLabel, value: MISSING_FIGURE },
			{ key: 'near', label: nearLabel, value: MISSING_FIGURE },
			{ key: 'tracked', label: trackedLabel, value: MISSING_FIGURE },
			{ key: 'used', label: usedLabel, value: MISSING_FIGURE }
		];
	}
	const totals = figures.totals;
	const limitText = formatHoursLabel(totals.limit);
	return [
		{
			key: 'over',
			label: overLabel,
			value: String(figures.overCount),
			hint: t('dashboard.weeklyLimit.AFFECTED_MEMBERS', { count: figures.overMembers }),
			tone: toneWhenAny(figures.overCount, 'destructive')
		},
		{
			key: 'near',
			label: nearLabel,
			value: String(figures.nearCount),
			hint: t('dashboard.weeklyLimit.AFFECTED_MEMBERS', { count: figures.nearMembers }),
			tone: toneWhenAny(figures.nearCount, 'warning')
		},
		{
			key: 'tracked',
			label: trackedLabel,
			value: formatDurationShort(totals.used),
			hint: t('dashboard.weeklyLimit.TRACKED_BY', { count: figures.trackedMembers })
		},
		{
			key: 'used',
			label: usedLabel,
			value: shareValueOf(totals),
			hint: t('dashboard.weeklyLimit.LIMIT_USED_OF', { limit: limitText }),
			tone: shareToneOf(totals)
		}
	];
}

/** Drawn by the route skeleton and by the page on its first load: one picture from the route to the data. */
export function WeeklyLimitFiguresSkeleton({ duration = 'day' }: Readonly<{ duration?: LimitDuration }>) {
	const t = useTranslations();
	const items = useMemo(() => figureItemsOf(null, duration, t), [duration, t]);
	const label = t('dashboard.weeklyLimit.FIGURES_LABEL');
	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={label} isLoading />
		</section>
	);
}

export function WeeklyLimitFigures({
	figures,
	duration,
	isLoading
}: Readonly<{ figures: LimitFigures | null; duration: LimitDuration; isLoading: boolean }>) {
	const t = useTranslations();
	const items = useMemo(() => figureItemsOf(figures, duration, t), [duration, figures, t]);
	const label = t('dashboard.weeklyLimit.FIGURES_LABEL');
	if (isLoading) {
		return <WeeklyLimitFiguresSkeleton duration={duration} />;
	}
	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={label} />
		</section>
	);
}
