'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MetricStrip, type MetricItem, type MetricTone } from '@/core/components/dashboards/kit/metric-strip';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { limitShareLabelOf } from '@/core/lib/utils/dashboards/weekly-limit';
import {
	amountTextOf,
	budgetTextOf,
	MAX_COST_FIGURES,
	type BudgetFigures,
	type BudgetScope,
	type BudgetTotal
} from '@/core/lib/utils/dashboards/project-budget';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import type { FormatLocale } from '@/core/lib/utils/workspace-formats';
import { budgetNotesOf, costBudgetsLabelOf, MISSING_FIGURE } from './budget-cells';

type Translate = ReturnType<typeof useTranslations>;

function toneWhenAny(count: number, tone: MetricTone): MetricTone {
	if (count > 0) {
		return tone;
	}
	return 'default';
}

function SpentOfTotal({ total, locale }: Readonly<{ total: BudgetTotal; locale: FormatLocale }>) {
	const spentText = amountTextOf(total.spent, total, locale);
	const budgetText = budgetTextOf(total.budget, total, locale);
	return (
		<>
			<span>{spentText}</span>
			<span className="font-normal text-muted-foreground">{` / ${budgetText}`}</span>
		</>
	);
}

function usedHintOf(total: BudgetTotal, t: Translate) {
	const share = limitShareLabelOf(total.share, total.verdict);
	return t('dashboard.projectBudget.USED_SHARE', { share });
}

function hoursItemOf(figures: BudgetFigures, locale: FormatLocale, t: Translate): MetricItem<string> {
	const label = t('dashboard.projectBudget.HOURS_BUDGETS');
	const total = figures.hoursTotal;
	if (!total) {
		return { key: 'hours', label, value: MISSING_FIGURE, hint: t('dashboard.projectBudget.NO_HOURS_BUDGET') };
	}
	return {
		key: 'hours',
		label,
		value: <SpentOfTotal total={total} locale={locale} />,
		hint: usedHintOf(total, t)
	};
}

function costItemsOf(figures: BudgetFigures, locale: FormatLocale, t: Translate): MetricItem<string>[] {
	const shownTotals = figures.costTotals.slice(0, MAX_COST_FIGURES);
	if (shownTotals.length === 0) {
		return [
			{
				key: 'cost',
				label: t('dashboard.projectBudget.COST_BUDGETS'),
				value: MISSING_FIGURE,
				hint: t('dashboard.projectBudget.NO_COST_BUDGET')
			}
		];
	}
	return shownTotals.map((total) => ({
		key: total.key,
		label: costBudgetsLabelOf(total, t),
		value: <SpentOfTotal total={total} locale={locale} />,
		hint: usedHintOf(total, t)
	}));
}

function skeletonItemsOf(t: Translate): MetricItem<string>[] {
	return [
		{ key: 'over', label: t('dashboard.projectBudget.RISK_OVER'), value: MISSING_FIGURE },
		{ key: 'near', label: t('dashboard.projectBudget.RISK_NEAR'), value: MISSING_FIGURE },
		{ key: 'hours', label: t('dashboard.projectBudget.HOURS_BUDGETS'), value: MISSING_FIGURE },
		{ key: 'cost', label: t('dashboard.projectBudget.COST_BUDGETS'), value: MISSING_FIGURE },
		{ key: 'withoutBudget', label: t('dashboard.projectBudget.RISK_NO_BUDGET'), value: MISSING_FIGURE }
	];
}

function figureItemsOf(figures: BudgetFigures, locale: FormatLocale, t: Translate): MetricItem<string>[] {
	return [
		{
			key: 'over',
			label: t('dashboard.projectBudget.RISK_OVER'),
			value: String(figures.overCount),
			hint: t('dashboard.projectBudget.OF_PROJECTS', { count: figures.budgetedCount }),
			tone: toneWhenAny(figures.overCount, 'destructive')
		},
		{
			key: 'near',
			label: t('dashboard.projectBudget.RISK_NEAR'),
			value: String(figures.nearCount),
			hint: t('dashboard.projectBudget.NEAR_HINT'),
			tone: toneWhenAny(figures.nearCount, 'warning')
		},
		hoursItemOf(figures, locale, t),
		...costItemsOf(figures, locale, t),
		{
			key: 'withoutBudget',
			label: t('dashboard.projectBudget.RISK_NO_BUDGET'),
			value: String(figures.withoutBudgetCount),
			hint: t('dashboard.projectBudget.WITHOUT_BUDGET_HINT', { count: figures.withoutBudgetCount })
		}
	];
}

export function ProjectBudgetFiguresSkeleton() {
	const t = useTranslations();
	const items = useMemo(() => skeletonItemsOf(t), [t]);
	const label = t('dashboard.projectBudget.FIGURES_LABEL');
	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={label} isLoading />
		</section>
	);
}

export function ProjectBudgetFigures({
	figures,
	scope,
	isLoading
}: Readonly<{ figures: BudgetFigures; scope: BudgetScope; isLoading: boolean }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const items = useMemo(() => figureItemsOf(figures, locale, t), [figures, locale, t]);
	const notes = budgetNotesOf(figures, scope, t);
	const hasNotes = notes.length > 0;
	const label = t('dashboard.projectBudget.FIGURES_LABEL');
	if (isLoading) {
		return <ProjectBudgetFiguresSkeleton />;
	}
	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<MetricStrip items={items} ariaLabel={label} />
			{hasNotes && (
				<p className="px-4 py-2.5 text-xs text-muted-foreground text-pretty hairline-t border-dashed border-border">
					{notes.join(' ')}
				</p>
			)}
		</section>
	);
}
