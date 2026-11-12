'use client';

import { useId, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { MetricStrip, type MetricItem, type MetricTone } from '@/core/components/dashboards/kit/metric-strip';
import {
	MISSING_FIGURE,
	remainingLabelOf,
	shareTextOf,
	typeTextOf,
	verdictKeyOf
} from '@/core/components/dashboards/project-budget/budget-cells';
import {
	BudgetPillMeter,
	BudgetPillMeterSkeleton
} from '@/core/components/dashboards/project-budget/budget-pill-meter';
import { ArrowUpRight } from '@/core/components/icons';
import { useCanSeeProjectConsumption, useProjectConsumption } from '@/core/hooks/projects/use-project-consumption';
import {
	amountTextOf,
	budgetTextOf,
	budgetTypeOf,
	isHoursBudget,
	projectBudgetPathOf,
	type BudgetRow
} from '@/core/lib/utils/dashboards/project-budget';
import { budgetUseOf, CONSUMPTION_SCOPE, hasProjectBudget } from '@/core/lib/utils/project-consumption';
import type { TOrganizationProject } from '@/core/types/schemas';

type Translate = ReturnType<typeof useTranslations>;

type SummaryItem = MetricItem<string>;

const SUMMARY_SURFACE = 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

/** The report states the time of an hours project in hours and of any other as a cost: the first figure says which. */
function spentLabelOf(isHoursType: boolean, t: Translate) {
	if (isHoursType) {
		return t('common.TIME_SPENT');
	}
	return t('dashboard.projectBudget.COLUMN_SPENT');
}

function isHoursTypeOf(project: TOrganizationProject, row: BudgetRow | undefined) {
	if (row) {
		return isHoursBudget(row);
	}
	const budgetType = budgetTypeOf(project.budgetType);
	return isHoursBudget({ budgetType });
}

function spentItemOf(row: BudgetRow | undefined, label: string, locale: string, t: Translate): SummaryItem {
	if (!row?.hasTime) {
		return { key: 'spent', label, value: MISSING_FIGURE, hint: t('dashboard.projectBudget.RISK_NO_TIME') };
	}
	return { key: 'spent', label, value: amountTextOf(row.spent, row, locale) };
}

function budgetItemOf(budgetUse: BudgetRow | null, locale: string, t: Translate): SummaryItem {
	const label = t('pages.projects.list.COLUMN_BUDGET');
	if (!budgetUse) {
		return { key: 'budget', label, value: MISSING_FIGURE, hint: t('dashboard.projectBudget.NO_BUDGET') };
	}
	const budgetText = budgetTextOf(budgetUse.budget, budgetUse, locale);
	return { key: 'budget', label, value: budgetText, hint: typeTextOf(budgetUse, t) };
}

function usedToneOf(budgetUse: BudgetRow): MetricTone {
	if (budgetUse.risk === 'over') {
		return 'destructive';
	}
	if (budgetUse.risk === 'near') {
		return 'warning';
	}
	return 'default';
}

function usedItemOf(budgetUse: BudgetRow, t: Translate): SummaryItem {
	const verdictKey = verdictKeyOf(budgetUse, budgetUse.risk, CONSUMPTION_SCOPE);
	return {
		key: 'used',
		label: t('dashboard.projectBudget.COLUMN_USED'),
		value: shareTextOf(budgetUse),
		hint: t(verdictKey),
		tone: usedToneOf(budgetUse)
	};
}

function remainingToneOf(budgetUse: BudgetRow): MetricTone {
	const isOver = budgetUse.remaining < 0;
	if (isOver) {
		return 'destructive';
	}
	return 'default';
}

function remainingItemOf(budgetUse: BudgetRow, locale: string, t: Translate): SummaryItem {
	return {
		key: 'remaining',
		label: t('dashboard.projectBudget.COLUMN_REMAINING'),
		value: remainingLabelOf(budgetUse, locale, t),
		tone: remainingToneOf(budgetUse)
	};
}

function summaryItemsOf(row: BudgetRow | undefined, spentLabel: string, locale: string, t: Translate): SummaryItem[] {
	const budgetUse = budgetUseOf(row);
	const items = [spentItemOf(row, spentLabel, locale, t), budgetItemOf(budgetUse, locale, t)];
	if (budgetUse) {
		items.push(usedItemOf(budgetUse, t), remainingItemOf(budgetUse, locale, t));
	}
	return items;
}

/** The figures a loaded summary will show, known from the project itself: the strip keeps its cells while it loads. */
function loadingItemsOf(project: TOrganizationProject, spentLabel: string, t: Translate): SummaryItem[] {
	const items: SummaryItem[] = [
		{ key: 'spent', label: spentLabel, value: MISSING_FIGURE },
		{ key: 'budget', label: t('pages.projects.list.COLUMN_BUDGET'), value: MISSING_FIGURE }
	];
	if (hasProjectBudget(project)) {
		items.push(
			{ key: 'used', label: t('dashboard.projectBudget.COLUMN_USED'), value: MISSING_FIGURE },
			{ key: 'remaining', label: t('dashboard.projectBudget.COLUMN_REMAINING'), value: MISSING_FIGURE }
		);
	}
	return items;
}

function ReportLink({ projectId }: Readonly<{ projectId: string }>) {
	const t = useTranslations();
	return (
		<Button asChild variant="outline" size="sm">
			<Link href={projectBudgetPathOf(projectId)} prefetch={false}>
				{t('pages.projects.consumption.OPEN_REPORT')}
				<ArrowUpRight aria-hidden="true" />
			</Link>
		</Button>
	);
}

function SummaryFrame({
	label,
	items,
	isLoading,
	action,
	children
}: Readonly<{
	label: string;
	items: ReadonlyArray<SummaryItem>;
	isLoading: boolean;
	action?: ReactNode;
	children?: ReactNode;
}>) {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} aria-busy={isLoading} className={SUMMARY_SURFACE}>
			<header className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-2">
				<h2 id={headingId} className="text-[13px] font-semibold text-foreground">
					{label}
				</h2>
				{action}
			</header>
			<MetricStrip items={items} ariaLabel={label} isLoading={isLoading} />
			{children}
		</section>
	);
}

function MeterRow({ children }: Readonly<{ children: ReactNode }>) {
	return <div className="px-4 pb-4">{children}</div>;
}

export function ProjectBudgetSummary({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const locale = useLocale();
	const showsConsumption = useCanSeeProjectConsumption();
	const consumption = useProjectConsumption({ isEnabled: showsConsumption });

	if (!consumption.isAvailable) {
		return null;
	}
	if (consumption.hasFailed) {
		return <DashboardErrorNotice title={t('pages.projects.consumption.LOAD_ERROR')} onRetry={consumption.retry} />;
	}

	const label = t('pages.projects.consumption.SUMMARY_LABEL');

	if (consumption.isLoading) {
		const isHoursTypeProject = isHoursTypeOf(project, undefined);
		const loadingLabel = spentLabelOf(isHoursTypeProject, t);
		const loadingItems = loadingItemsOf(project, loadingLabel, t);
		return (
			<SummaryFrame label={label} items={loadingItems} isLoading>
				{hasProjectBudget(project) && (
					<MeterRow>
						<BudgetPillMeterSkeleton />
					</MeterRow>
				)}
			</SummaryFrame>
		);
	}

	const row = consumption.rowOf(project.id);
	const budgetUse = budgetUseOf(row);
	const isHoursType = isHoursTypeOf(project, row);
	const spentLabel = spentLabelOf(isHoursType, t);
	const items = summaryItemsOf(row, spentLabel, locale, t);
	const showsCostNote = Boolean(row) && !isHoursType;

	return (
		<SummaryFrame
			label={label}
			items={items}
			isLoading={false}
			action={row && <ReportLink projectId={project.id} />}
		>
			{budgetUse && (
				<MeterRow>
					<BudgetPillMeter amounts={budgetUse} />
				</MeterRow>
			)}
			{showsCostNote && (
				<p className="px-4 pb-3 text-xs text-muted-foreground text-pretty">
					{t('dashboard.projectBudget.COST_NOTE')}
				</p>
			)}
		</SummaryFrame>
	);
}
