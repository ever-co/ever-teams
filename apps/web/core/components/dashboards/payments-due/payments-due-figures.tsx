'use client';

import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { DayBarsChart } from '@/core/components/dashboards/kit/day-bars-chart';
import { type MetricItem, MetricStrip } from '@/core/components/dashboards/kit/metric-strip';
import { SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import type { PaymentsChart, PaymentsChartKind } from '@/core/hooks/dashboards/payments-due/use-payments-due-report';
import {
	formatDurationShort,
	formatHoursLabel,
	type TimeAxis,
	timeAxisOf,
	valueAxisOf
} from '@/core/lib/utils/dashboard-figures';
import {
	chartKeyOfCurrency,
	formatOwed,
	formatOwedTick,
	maxValueOf,
	type OwedCurrencyTotal,
	type OwedFigures,
	type PaymentsChartKey
} from '@/core/lib/utils/dashboards/payments-due';
import { MISSING_FIGURE } from './payments-due-cells';

type Translate = ReturnType<typeof useTranslations>;

const CHART_HEIGHT = 'h-44';

const VALUE_LABEL_KEYS: Record<PaymentsChartKind, DottedLanguageObjectStringPaths> = {
	amount: 'dashboard.paymentsDue.chart.OWED',
	tracked: 'dashboard.paymentsDue.chart.TRACKED',
	unpriced: 'dashboard.paymentsDue.chart.UNPRICED'
};

function owedLabelOf(currency: string | null, t: Translate) {
	if (currency) {
		return t('dashboard.paymentsDue.figures.OWED_IN', { currency });
	}
	return t('dashboard.paymentsDue.figures.OWED');
}

function currencyItemOf(total: OwedCurrencyTotal, locale: string, t: Translate): MetricItem<PaymentsChartKey> {
	const value = formatOwed(total.amount, total.currency, locale);
	return {
		key: chartKeyOfCurrency(total.currency),
		label: owedLabelOf(total.currency, t),
		value: <span title={value}>{value}</span>,
		hint: t('dashboard.paymentsDue.figures.CURRENCY_HINT', {
			count: total.memberCount,
			duration: formatDurationShort(total.seconds)
		})
	};
}

function trackedItemOf(figures: OwedFigures, t: Translate): MetricItem<PaymentsChartKey> {
	return {
		key: 'tracked',
		label: t('dashboard.paymentsDue.figures.TRACKED'),
		value: formatDurationShort(figures.trackedSeconds),
		hint: t('dashboard.paymentsDue.MEMBERS_COUNT', { count: figures.trackedMemberCount })
	};
}

function unpricedHintOf(figures: OwedFigures, t: Translate) {
	const hasTime = figures.trackedSeconds > 0;
	if (!hasTime) {
		return undefined;
	}
	const unpricedSeconds = figures.unpriced.seconds;
	if (unpricedSeconds <= 0) {
		return t('dashboard.paymentsDue.figures.ALL_PRICED');
	}
	return t('dashboard.paymentsDue.figures.NOT_PRICED', { duration: formatDurationShort(unpricedSeconds) });
}

function unpricedItemOf(figures: OwedFigures, t: Translate): MetricItem<PaymentsChartKey> {
	const memberCount = figures.unpriced.memberCount;
	const hasUnpriced = memberCount > 0;
	const item: MetricItem<PaymentsChartKey> = {
		key: 'unpriced',
		label: t('dashboard.paymentsDue.figures.WITHOUT_RATE'),
		value: String(memberCount),
		hint: unpricedHintOf(figures, t)
	};
	if (hasUnpriced) {
		item.tone = 'warning';
	}
	return item;
}

function placeholderItemsOf(t: Translate): MetricItem<PaymentsChartKey>[] {
	return [
		{ key: chartKeyOfCurrency(null), label: t('dashboard.paymentsDue.figures.OWED'), value: MISSING_FIGURE },
		{ key: 'tracked', label: t('dashboard.paymentsDue.figures.TRACKED'), value: MISSING_FIGURE },
		{ key: 'unpriced', label: t('dashboard.paymentsDue.figures.WITHOUT_RATE'), value: MISSING_FIGURE }
	];
}

function noCurrencyHintOf(figures: OwedFigures, t: Translate) {
	const hasTime = figures.trackedSeconds > 0;
	if (!hasTime) {
		return undefined;
	}
	return t('dashboard.paymentsDue.figures.NOTHING_PRICED');
}

function noCurrencyItemOf(figures: OwedFigures, t: Translate): MetricItem<PaymentsChartKey> {
	return {
		key: chartKeyOfCurrency(null),
		label: t('dashboard.paymentsDue.figures.OWED'),
		value: MISSING_FIGURE,
		hint: noCurrencyHintOf(figures, t)
	};
}

function figureItemsOf(
	figures: OwedFigures,
	currencies: ReadonlyArray<OwedCurrencyTotal>,
	locale: string,
	t: Translate
): MetricItem<PaymentsChartKey>[] {
	const currencyItems = currencies.map((total) => currencyItemOf(total, locale, t));
	const hasCurrencies = currencyItems.length > 0;
	if (!hasCurrencies) {
		currencyItems.push(noCurrencyItemOf(figures, t));
	}
	return [...currencyItems, trackedItemOf(figures, t), unpricedItemOf(figures, t)];
}

function chartTitleOf(chart: PaymentsChart, t: Translate) {
	if (chart.kind === 'tracked') {
		return t('dashboard.paymentsDue.chart.TITLE_TRACKED');
	}
	if (chart.kind === 'unpriced') {
		return t('dashboard.paymentsDue.chart.TITLE_UNPRICED');
	}
	if (chart.currency) {
		return t('dashboard.paymentsDue.chart.TITLE_OWED_IN', { currency: chart.currency });
	}
	return t('dashboard.paymentsDue.chart.TITLE_OWED');
}

function chartAxisOf(chart: PaymentsChart): TimeAxis {
	const maxValue = maxValueOf(chart.days);
	if (chart.kind === 'amount') {
		return valueAxisOf(maxValue);
	}
	return timeAxisOf(maxValue);
}

function chartEmptyMessageOf(chart: PaymentsChart, figures: OwedFigures, t: Translate) {
	const hasTime = figures.trackedSeconds > 0;
	if (!hasTime) {
		return t('dashboard.paymentsDue.chart.EMPTY');
	}
	const isUnpricedChart = chart.kind === 'unpriced';
	const isAllPriced = figures.unpriced.seconds <= 0;
	const showsAllPriced = isUnpricedChart && isAllPriced;
	if (showsAllPriced) {
		return t('dashboard.paymentsDue.figures.ALL_PRICED');
	}
	return null;
}

function ChartPart({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-4 hairline-t border-border">
			<h2 className={SECTION_TITLE}>{title}</h2>
			{children}
		</div>
	);
}

const OwedChart = memo(function OwedChart({
	chart,
	emptyMessage,
	title
}: Readonly<{ chart: PaymentsChart; emptyMessage: string | null; title: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const axis = useMemo(() => chartAxisOf(chart), [chart]);
	const currency = chart.currency;
	const isAmount = chart.kind === 'amount';

	const formatValue = useCallback(
		(value: number) => {
			if (isAmount) {
				return formatOwed(value, currency, locale);
			}
			return formatDurationShort(value);
		},
		[currency, isAmount, locale]
	);

	const formatTick = useCallback(
		(value: number) => {
			if (isAmount) {
				return formatOwedTick(value, currency, locale);
			}
			return formatHoursLabel(value);
		},
		[currency, isAmount, locale]
	);

	return (
		<div className="relative">
			<DayBarsChart
				data={chart.days}
				axis={axis}
				ariaLabel={title}
				valueLabel={t(VALUE_LABEL_KEYS[chart.kind])}
				formatValue={formatValue}
				formatTick={formatTick}
				heightClassName={CHART_HEIGHT}
			/>
			{emptyMessage && (
				<div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 items-center justify-center">
					<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
						{emptyMessage}
					</p>
				</div>
			)}
		</div>
	);
});

function OwedNote() {
	const t = useTranslations();
	return (
		<p className="px-4 py-2 text-xs text-muted-foreground text-pretty hairline-t border-dashed border-border">
			{t('dashboard.paymentsDue.NOTE')}
		</p>
	);
}

export function PaymentsDueFiguresSkeleton() {
	const t = useTranslations();
	const items = useMemo(() => placeholderItemsOf(t), [t]);
	const label = t('dashboard.paymentsDue.figures.LABEL');
	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} ariaLabel={label} isLoading />
			<OwedNote />
			<ChartPart title={t('dashboard.paymentsDue.chart.TITLE_OWED')}>
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</ChartPart>
		</DashboardSection>
	);
}

export function PaymentsDueFigures({
	figures,
	currencies,
	chart,
	onChartChange,
	isLoading
}: Readonly<{
	figures: OwedFigures | null;
	currencies: ReadonlyArray<OwedCurrencyTotal>;
	chart: PaymentsChart | null;
	onChartChange: (key: PaymentsChartKey) => void;
	isLoading: boolean;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const items = useMemo(() => {
		if (!figures) {
			return placeholderItemsOf(t);
		}
		return figureItemsOf(figures, currencies, locale, t);
	}, [currencies, figures, locale, t]);

	if (isLoading) {
		return <PaymentsDueFiguresSkeleton />;
	}
	if (!figures) {
		return <PaymentsDueFiguresSkeleton />;
	}
	if (!chart) {
		return <PaymentsDueFiguresSkeleton />;
	}

	const label = t('dashboard.paymentsDue.figures.LABEL');
	const isSelectable = currencies.length > 0;
	const chartTitle = chartTitleOf(chart, t);
	const emptyMessage = chartEmptyMessageOf(chart, figures, t);

	if (!isSelectable) {
		return (
			<DashboardSection ariaLabel={label}>
				<MetricStrip items={items} ariaLabel={label} />
				<OwedNote />
				<ChartPart title={chartTitle}>
					<OwedChart chart={chart} emptyMessage={emptyMessage} title={chartTitle} />
				</ChartPart>
			</DashboardSection>
		);
	}

	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} ariaLabel={label} selectedKey={chart.key} onSelect={onChartChange} />
			<OwedNote />
			<ChartPart title={chartTitle}>
				<OwedChart chart={chart} emptyMessage={emptyMessage} title={chartTitle} />
			</ChartPart>
		</DashboardSection>
	);
}
