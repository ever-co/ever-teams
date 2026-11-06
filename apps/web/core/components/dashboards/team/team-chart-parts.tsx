'use client';

import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { activityPercentOf } from '@/core/lib/utils/daily-report-figures';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { ChartGranularity, ColumnStack } from '@/core/lib/utils/dashboards/team';
import type { ColumnDatum } from './team-columns-chart';
import { type SlotFormats, slotLabelsOf } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

export const CHART_HEIGHT = 'h-56';

const GRANULARITY_LABEL_KEYS = {
	day: 'dashboard.team.chart.DAY',
	week: 'dashboard.team.chart.WEEK',
	month: 'dashboard.team.chart.MONTH'
} as const;

function slotActivityOf(stack: ColumnStack) {
	const hasActiveTime = stack.bucket.activeSeconds > 0;
	if (!hasActiveTime) {
		return null;
	}
	return activityPercentOf(stack.bucket);
}

export function columnDatumOf(
	stack: ColumnStack,
	granularity: ChartGranularity,
	formats: SlotFormats,
	periodDays: number,
	t: Translate
): ColumnDatum {
	const labels = slotLabelsOf(stack.bucket.start, granularity, formats, periodDays, t);
	return {
		key: stack.key,
		label: labels.label,
		axisLabel: labels.axisLabel,
		stack,
		total: stack.bucket.seconds,
		memberCount: stack.bucket.memberCount,
		activity: slotActivityOf(stack),
		isToday: stack.bucket.isToday,
		isFuture: stack.bucket.isFuture
	};
}

function peakOf(data: ReadonlyArray<ColumnDatum>) {
	let peak: ColumnDatum | null = null;
	for (const datum of data) {
		const isCandidate = !datum.isFuture && datum.total > 0;
		const peakTotal = peak?.total ?? 0;
		const isHigher = datum.total > peakTotal;
		if (isCandidate && isHigher) {
			peak = datum;
		}
	}
	return peak;
}

export function peakTextOf(data: ReadonlyArray<ColumnDatum>, t: Translate) {
	const peak = peakOf(data);
	if (!peak) {
		return null;
	}
	const peakValue = formatDurationShort(peak.total);
	return t('dashboard.team.chart.PEAK', { label: peak.label, value: peakValue });
}

export function emptyChartSentenceOf(hasFilters: boolean, t: Translate) {
	if (hasFilters) {
		return t('dashboard.team.chart.EMPTY_FILTERED');
	}
	return t('dashboard.team.chart.EMPTY');
}

export function GranularityControl({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const items: SegmentedControlItem<ChartGranularity>[] = dashboard.granularityOptions.map((option) => ({
		value: option,
		label: t(GRANULARITY_LABEL_KEYS[option])
	}));
	if (items.length === 0) {
		return null;
	}
	return (
		<SegmentedControl
			items={items}
			value={dashboard.granularity}
			onValueChange={dashboard.setGranularity}
			ariaLabel={t('dashboard.team.chart.GROUP_BY')}
		/>
	);
}
