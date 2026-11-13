'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { FilePdf, FileSheet } from '@/core/components/icons';
import {
	type CsvColumn,
	downloadCsv,
	downloadPdf,
	localDayKeyOf,
	periodFileNameOf
} from '@/core/lib/utils/dashboard-export';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { limitShareLabelOf } from '@/core/lib/utils/dashboards/weekly-limit';
import {
	amountTextOf,
	budgetTextOf,
	exportNumberOf,
	exportShareOf,
	type BudgetFigures,
	type BudgetGroup,
	type BudgetRow,
	type BudgetScope,
	type BudgetTotal
} from '@/core/lib/utils/dashboards/project-budget';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import {
	budgetLabelOf,
	budgetNotesOf,
	costBudgetsLabelOf,
	MISSING_FIGURE,
	remainingLabelOf,
	riskLabelKeyOf,
	shareTextOf,
	totalLabelOf,
	typeTextOf,
	verdictKeyOf
} from './budget-cells';
import type { BudgetPdfFigure, BudgetPdfGroup, BudgetPdfRow, ProjectBudgetPdfContent } from './project-budget-pdf';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'project-budget';

function fileNameOf(scope: BudgetScope, period: Period, extension: 'csv' | 'pdf') {
	if (scope === 'whole') {
		const todayKey = localDayKeyOf(period.to);
		return `${FILE_PREFIX}-to-${todayKey}.${extension}`;
	}
	return periodFileNameOf(FILE_PREFIX, period.from, period.to, extension);
}

function plainTypeOf(row: BudgetRow, t: Translate) {
	return typeTextOf({ budgetType: row.budgetType, currency: null }, t);
}

function budgetCellOf(row: BudgetRow) {
	if (!row.hasBudget) {
		return null;
	}
	return exportNumberOf(row.budget);
}

function remainingCellOf(row: BudgetRow) {
	if (!row.hasBudget) {
		return null;
	}
	return exportNumberOf(row.remaining);
}

function usedCellOf(row: BudgetRow) {
	if (!row.hasBudget) {
		return null;
	}
	return exportShareOf(row.share);
}

/** Hours budgets export decimal hours and cost budgets their amount, so a sheet can add a column of one type. */
function csvColumnsOf(scope: BudgetScope, t: Translate): CsvColumn<BudgetRow>[] {
	const statusCellOf = (row: BudgetRow) => {
		const statusKey = riskLabelKeyOf(row.risk, scope);
		return t(statusKey);
	};
	return [
		{ header: t('dashboard.projectBudget.COLUMN_PROJECT'), valueOf: (row) => row.project.name },
		{ header: t('dashboard.projectBudget.COLUMN_TYPE'), valueOf: (row) => plainTypeOf(row, t) },
		{ header: t('dashboard.projectBudget.CSV_CURRENCY'), valueOf: (row) => row.currency },
		{ header: t('dashboard.projectBudget.COLUMN_BUDGET'), valueOf: budgetCellOf },
		{ header: t('dashboard.projectBudget.COLUMN_SPENT'), valueOf: (row) => exportNumberOf(row.spent) },
		{ header: t('dashboard.projectBudget.COLUMN_REMAINING'), valueOf: remainingCellOf },
		{ header: t('dashboard.projectBudget.CSV_USED'), valueOf: usedCellOf },
		{ header: t('common.STATUS'), valueOf: statusCellOf }
	];
}

function rowsInViewOrder(groups: ReadonlyArray<BudgetGroup>) {
	return groups.flatMap((group) => group.rows);
}

function totalSpentOfBudget(total: BudgetTotal, locale: FormatLocale) {
	const spentText = amountTextOf(total.spent, total, locale);
	const budgetText = budgetTextOf(total.budget, total, locale);
	return `${spentText} / ${budgetText}`;
}

function hoursFigureOf(figures: BudgetFigures, locale: FormatLocale, t: Translate): BudgetPdfFigure {
	const label = t('dashboard.projectBudget.HOURS_BUDGETS');
	const total = figures.hoursTotal;
	if (!total) {
		return { label, value: MISSING_FIGURE };
	}
	return { label, value: totalSpentOfBudget(total, locale) };
}

function summaryOf(figures: BudgetFigures, locale: FormatLocale, t: Translate): BudgetPdfFigure[] {
	const costFigures = figures.costTotals.map((total) => ({
		label: costBudgetsLabelOf(total, t),
		value: totalSpentOfBudget(total, locale)
	}));
	return [
		{ label: t('dashboard.projectBudget.RISK_OVER'), value: String(figures.overCount) },
		{ label: t('dashboard.projectBudget.RISK_NEAR'), value: String(figures.nearCount) },
		hoursFigureOf(figures, locale, t),
		...costFigures,
		{ label: t('dashboard.projectBudget.RISK_NO_BUDGET'), value: String(figures.withoutBudgetCount) }
	];
}

function pdfRowOf(row: BudgetRow, scope: BudgetScope, locale: FormatLocale, t: Translate): BudgetPdfRow {
	const statusKey = verdictKeyOf(row, row.risk, scope);
	return {
		key: row.key,
		project: row.project.name,
		type: typeTextOf(row, t),
		budget: budgetLabelOf(row, locale),
		spent: amountTextOf(row.spent, row, locale),
		remaining: remainingLabelOf(row, locale, t),
		used: shareTextOf(row),
		status: t(statusKey)
	};
}

function pdfTotalOf(total: BudgetTotal, scope: BudgetScope, locale: FormatLocale, t: Translate): BudgetPdfRow {
	const label = totalLabelOf(total, t);
	const count = t('dashboard.projectBudget.PROJECTS_COUNT', { count: total.projectCount });
	const statusKey = verdictKeyOf(total, null, scope);
	return {
		key: total.key,
		project: `${label} · ${count}`,
		type: typeTextOf(total, t),
		budget: budgetTextOf(total.budget, total, locale),
		spent: amountTextOf(total.spent, total, locale),
		remaining: remainingLabelOf(total, locale, t),
		used: limitShareLabelOf(total.share, total.verdict),
		status: t(statusKey)
	};
}

function pdfGroupsOf(
	groups: ReadonlyArray<BudgetGroup>,
	scope: BudgetScope,
	locale: FormatLocale,
	t: Translate
): BudgetPdfGroup[] {
	return groups.map((group) => {
		const labelKey = riskLabelKeyOf(group.risk, scope);
		const label = t(labelKey);
		const count = t('dashboard.projectBudget.PROJECTS_COUNT', { count: group.rows.length });
		const rows = group.rows.map((row) => pdfRowOf(row, scope, locale, t));
		return { key: group.risk, title: `${label} · ${count}`, rows };
	});
}

function scopeTextOf(scope: BudgetScope, period: Period, locale: FormatLocale, t: Translate) {
	if (scope === 'whole') {
		const dayFormat = dateFormatOf(locale, { dateStyle: 'medium' });
		const day = dayFormat.format(period.to);
		return t('dashboard.projectBudget.PDF_SCOPE_WHOLE', { day });
	}
	return formatPeriod(period, locale);
}

interface PdfInput {
	scope: BudgetScope;
	period: Period;
	groups: ReadonlyArray<BudgetGroup>;
	totals: ReadonlyArray<BudgetTotal>;
	figures: BudgetFigures;
	locale: FormatLocale;
	t: Translate;
}

function pdfContentOf({ scope, period, groups, totals, figures, locale, t }: PdfInput): ProjectBudgetPdfContent {
	const generatedFormat = dateFormatOf(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const generatedAt = generatedFormat.format(new Date());
	return {
		title: t('dashboard.projectBudget.TITLE'),
		scope: scopeTextOf(scope, period, locale, t),
		generatedOn: t('dashboard.projectBudget.PDF_GENERATED', { date: generatedAt }),
		summary: summaryOf(figures, locale, t),
		notes: budgetNotesOf(figures, scope, t),
		columns: {
			project: t('dashboard.projectBudget.COLUMN_PROJECT'),
			type: t('dashboard.projectBudget.COLUMN_TYPE'),
			budget: t('dashboard.projectBudget.COLUMN_BUDGET'),
			spent: t('dashboard.projectBudget.COLUMN_SPENT'),
			remaining: t('dashboard.projectBudget.COLUMN_REMAINING'),
			used: t('dashboard.projectBudget.COLUMN_USED'),
			status: t('common.STATUS')
		},
		groups: pdfGroupsOf(groups, scope, locale, t),
		totals: totals.map((total) => pdfTotalOf(total, scope, locale, t)),
		pageLabel: (page, total) => t('dashboard.projectBudget.PDF_PAGE', { page, total })
	};
}

export function useProjectBudgetExportOptions({
	scope,
	period,
	groups,
	totals,
	figures
}: Readonly<{
	scope: BudgetScope;
	period: Period;
	groups: ReadonlyArray<BudgetGroup>;
	totals: ReadonlyArray<BudgetTotal>;
	figures: BudgetFigures;
}>): ExportOption[] {
	const t = useTranslations();
	const locale = useWorkspaceLocale();

	return useMemo(() => {
		const pdfInput: PdfInput = { scope, period, groups, totals, figures, locale, t };
		const pdfFileName = fileNameOf(scope, period, 'pdf');
		const csvFileName = fileNameOf(scope, period, 'csv');
		return [
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf />,
				run: () =>
					downloadPdf(async () => {
						const { buildProjectBudgetPdf } = await import('./project-budget-pdf');
						const content = pdfContentOf(pdfInput);
						return buildProjectBudgetPdf(content);
					}, pdfFileName)
			},
			{
				key: 'csv',
				label: t('dashboard.projectBudget.CSV'),
				icon: <FileSheet />,
				run: () => {
					const rows = rowsInViewOrder(groups);
					const columns = csvColumnsOf(scope, t);
					downloadCsv(rows, columns, csvFileName);
				}
			}
		];
	}, [figures, groups, locale, period, scope, t, totals]);
}
