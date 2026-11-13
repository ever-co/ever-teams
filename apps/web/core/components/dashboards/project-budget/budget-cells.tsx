'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { LimitMeter, limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import { isPaintableColor } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import { imgTitle } from '@/core/lib/helpers/index';
import { parseGeneratedAvatar } from '@/core/lib/utils/generated-avatar';
import { isValidUrl } from '@/core/lib/utils/is-valid-url';
import { limitShareLabelOf } from '@/core/lib/utils/dashboards/weekly-limit';
import {
	amountTextOf,
	budgetTextOf,
	isHoursBudget,
	meterUnitsOf,
	type BudgetAmounts,
	type BudgetFigures,
	type BudgetProject,
	type BudgetRisk,
	type BudgetRow,
	type BudgetScope,
	type BudgetTotal
} from '@/core/lib/utils/dashboards/project-budget';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import type { FormatLocale } from '@/core/lib/utils/workspace-formats';
import { DESKTOP_CELL, MOBILE_CELL, MOBILE_FULL_WIDTH } from './project-budget-grid';

type Translate = ReturnType<typeof useTranslations>;

export const MISSING_FIGURE = '–';

const FIGURE_TEXT = 'truncate text-right text-[13px] tabular-nums';

const RISK_LABEL_KEYS: Record<BudgetRisk, DottedLanguageObjectStringPaths> = {
	over: 'dashboard.projectBudget.RISK_OVER',
	near: 'dashboard.projectBudget.RISK_NEAR',
	within: 'dashboard.projectBudget.RISK_WITHIN',
	noTime: 'dashboard.projectBudget.RISK_NO_TIME',
	noBudget: 'dashboard.projectBudget.RISK_NO_BUDGET'
};

const RISK_DOT_TONES: Record<BudgetRisk, string> = {
	over: 'bg-destructive',
	near: 'bg-warning',
	within: 'bg-primary',
	noTime: 'bg-foreground/25',
	noBudget: 'bg-foreground/15'
};

export function riskLabelKeyOf(risk: BudgetRisk, scope: BudgetScope): DottedLanguageObjectStringPaths {
	const isNoTime = risk === 'noTime';
	const isPeriod = scope === 'period';
	const isNoTimeInPeriod = isNoTime && isPeriod;
	if (isNoTimeInPeriod) {
		return 'dashboard.projectBudget.RISK_NO_TIME_PERIOD';
	}
	return RISK_LABEL_KEYS[risk];
}

export function RiskDot({ risk, className }: Readonly<{ risk: BudgetRisk; className?: string }>) {
	return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', RISK_DOT_TONES[risk], className)} />;
}

export function typeTextOf(amounts: Pick<BudgetAmounts, 'budgetType' | 'currency'>, t: Translate) {
	if (isHoursBudget(amounts)) {
		return t('dashboard.projectBudget.TYPE_HOURS');
	}
	if (amounts.currency) {
		return t('dashboard.projectBudget.TYPE_COST_IN', { currency: amounts.currency });
	}
	return t('dashboard.projectBudget.TYPE_COST');
}

export function costBudgetsLabelOf(total: BudgetTotal, t: Translate) {
	if (total.currency) {
		return t('dashboard.projectBudget.COST_BUDGETS_IN', { currency: total.currency });
	}
	return t('dashboard.projectBudget.COST_BUDGETS');
}

export function totalLabelOf(total: BudgetTotal, t: Translate) {
	if (isHoursBudget(total)) {
		return t('dashboard.projectBudget.TOTAL_HOURS');
	}
	if (total.currency) {
		return t('dashboard.projectBudget.TOTAL_COST_IN', { currency: total.currency });
	}
	return t('dashboard.projectBudget.TOTAL_COST');
}

export function budgetNotesOf(figures: BudgetFigures, scope: BudgetScope, t: Translate) {
	const notes: string[] = [];
	if (scope === 'period') {
		notes.push(t('dashboard.projectBudget.PERIOD_NOTE'));
	}
	if (figures.hasCostRows) {
		notes.push(t('dashboard.projectBudget.COST_NOTE'));
	}
	return notes;
}

function dotColorOf(project: BudgetProject, placeholderColor: string | undefined) {
	if (isPaintableColor(project.color)) {
		return project.color;
	}
	return placeholderColor;
}

/**
 * The project's own image when it has one, otherwise its colour as a dot; Gauzy's generated placeholders lend
 * their colour to the dot instead of drawing a letter tile.
 */
export function ProjectMark({ project, className }: Readonly<{ project: BudgetProject; className?: string }>) {
	const imageUrl = project.imageUrl;
	const placeholder = parseGeneratedAvatar(imageUrl);
	const hasUrl = Boolean(imageUrl) && isValidUrl(imageUrl ?? '');
	const hasRealImage = hasUrl && !placeholder;
	const dotColor = dotColorOf(project, placeholder?.color);
	const hasDotColor = Boolean(dotColor);

	if (hasRealImage) {
		return (
			<Avatar
				className={cn('size-5 shrink-0 rounded-[28%] bg-muted hairline-ring ring-foreground/10', className)}
			>
				<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" className="size-full object-cover" />
				<AvatarFallback className="rounded-none text-[8px] font-medium">
					{imgTitle(project.name)}
				</AvatarFallback>
			</Avatar>
		);
	}
	return (
		<span aria-hidden="true" className={cn('flex size-5 shrink-0 items-center justify-center', className)}>
			{hasDotColor && <span className="size-2 rounded-full" style={{ backgroundColor: dotColor }} />}
			{!hasDotColor && <span className="size-2 rounded-full bg-foreground/20" />}
		</span>
	);
}

export function SpentOfBudget({ amounts, className }: Readonly<{ amounts: BudgetAmounts; className?: string }>) {
	const locale = useWorkspaceLocale();
	const spentText = amountTextOf(amounts.spent, amounts, locale);
	const budgetText = budgetTextOf(amounts.budget, amounts, locale);
	return (
		<span className={cn('truncate tabular-nums', className)}>
			<span className="text-foreground">{spentText}</span>
			{amounts.hasBudget && <span className="text-muted-foreground">{` / ${budgetText}`}</span>}
		</span>
	);
}

export function shareTextOf(amounts: BudgetAmounts) {
	if (!amounts.hasBudget) {
		return MISSING_FIGURE;
	}
	return limitShareLabelOf(amounts.share, amounts.verdict);
}

export function BudgetMeter({ amounts, className }: Readonly<{ amounts: BudgetAmounts; className?: string }>) {
	if (!amounts.hasBudget) {
		return (
			<span
				aria-hidden="true"
				className={cn('block h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/6', className)}
			/>
		);
	}
	const used = meterUnitsOf(amounts.spent, amounts);
	const limit = meterUnitsOf(amounts.budget, amounts);
	return <LimitMeter used={used} limit={limit} className={cn('min-w-0 flex-1', className)} />;
}

export function verdictKeyOf(
	amounts: BudgetAmounts,
	risk: BudgetRisk | null,
	scope: BudgetScope
): DottedLanguageObjectStringPaths {
	if (!amounts.hasBudget) {
		return 'dashboard.projectBudget.NO_BUDGET';
	}
	const isWithoutTime = risk === 'noTime';
	if (isWithoutTime) {
		return riskLabelKeyOf('noTime', scope);
	}
	return RISK_LABEL_KEYS[amounts.verdict];
}

function verdictToneOf(amounts: BudgetAmounts, risk: BudgetRisk | null) {
	const isWithoutTime = risk === 'noTime';
	const isQuiet = !amounts.hasBudget || isWithoutTime;
	if (isQuiet) {
		return 'text-muted-foreground';
	}
	return limitVerdictTextClassOf(amounts.verdict);
}

function VerdictWord({
	amounts,
	risk,
	scope
}: Readonly<{ amounts: BudgetAmounts; risk: BudgetRisk | null; scope: BudgetScope }>) {
	const t = useTranslations();
	const tone = verdictToneOf(amounts, risk);
	const labelKey = verdictKeyOf(amounts, risk, scope);
	return <span className={cn('w-24 shrink-0 truncate text-[13px]', tone)}>{t(labelKey)}</span>;
}

export function remainingLabelOf(amounts: BudgetAmounts, locale: FormatLocale, t: Translate) {
	if (!amounts.hasBudget) {
		return MISSING_FIGURE;
	}
	const isOver = amounts.remaining < 0;
	if (isOver) {
		const overrun = -amounts.remaining;
		const overrunText = amountTextOf(overrun, amounts, locale);
		return t('dashboard.projectBudget.OVER', { amount: overrunText });
	}
	const leftText = amountTextOf(amounts.remaining, amounts, locale);
	return t('dashboard.projectBudget.LEFT', { amount: leftText });
}

function remainingToneOf(amounts: BudgetAmounts) {
	if (!amounts.hasBudget) {
		return 'text-muted-foreground';
	}
	const isOver = amounts.remaining < 0;
	if (isOver) {
		return 'text-destructive-ink';
	}
	return 'text-foreground';
}

function budgetToneOf(amounts: BudgetAmounts) {
	if (!amounts.hasBudget) {
		return 'text-muted-foreground';
	}
	return 'text-foreground';
}

export function budgetLabelOf(amounts: BudgetAmounts, locale: FormatLocale) {
	if (!amounts.hasBudget) {
		return MISSING_FIGURE;
	}
	return budgetTextOf(amounts.budget, amounts, locale);
}

function RemainingText({ amounts }: Readonly<{ amounts: BudgetAmounts }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const tone = remainingToneOf(amounts);
	const label = remainingLabelOf(amounts, locale, t);
	return <span className={cn(FIGURE_TEXT, tone)}>{label}</span>;
}

function BudgetText({ amounts }: Readonly<{ amounts: BudgetAmounts }>) {
	const locale = useWorkspaceLocale();
	const tone = budgetToneOf(amounts);
	const label = budgetLabelOf(amounts, locale);
	return <span className={cn(FIGURE_TEXT, tone)}>{label}</span>;
}

function SpentText({ amounts }: Readonly<{ amounts: BudgetAmounts }>) {
	const locale = useWorkspaceLocale();
	const label = amountTextOf(amounts.spent, amounts, locale);
	return <span className={cn(FIGURE_TEXT, 'text-foreground')}>{label}</span>;
}

export function BudgetFigureCells({
	amounts,
	risk,
	scope
}: Readonly<{ amounts: BudgetAmounts; risk: BudgetRisk | null; scope: BudgetScope }>) {
	const t = useTranslations();
	const shareText = shareTextOf(amounts);
	return (
		<>
			<span role="cell" className={cn('truncate text-[13px] text-muted-foreground', DESKTOP_CELL)}>
				{typeTextOf(amounts, t)}
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<BudgetText amounts={amounts} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<SpentText amounts={amounts} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<RemainingText amounts={amounts} />
			</span>
			<span role="cell" className={cn('flex min-w-0 items-center gap-3', DESKTOP_CELL)}>
				<BudgetMeter amounts={amounts} />
				<span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-foreground">{shareText}</span>
				<VerdictWord amounts={amounts} risk={risk} scope={scope} />
			</span>
			<span role="cell" className={cn('text-right text-[13px] tabular-nums text-foreground', MOBILE_CELL)}>
				{shareText}
			</span>
			<span role="cell" className={cn('flex min-w-0 items-center gap-3', MOBILE_FULL_WIDTH)}>
				<BudgetMeter amounts={amounts} />
				<SpentOfBudget amounts={amounts} className="shrink-0 text-xs" />
			</span>
		</>
	);
}

export function ProjectName({ row }: Readonly<{ row: BudgetRow }>) {
	const t = useTranslations();
	const membersCount = row.project.membersCount;
	const hasMembersCount = typeof membersCount === 'number';
	return (
		<span className="flex min-w-0 flex-col">
			<span className="truncate text-[13px] text-foreground">{row.project.name}</span>
			{hasMembersCount && (
				<span className="truncate text-xs text-muted-foreground">
					{t('dashboard.projectBudget.MEMBERS_COUNT', { count: membersCount })}
				</span>
			)}
		</span>
	);
}
