'use client';

import { type CSSProperties, memo } from 'react';
import { useTranslations } from 'next-intl';
import { limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import {
	amountTextOf,
	budgetTextOf,
	isHoursBudget,
	type BudgetFigures,
	type BudgetScope,
	type BudgetTotal,
	type PortfolioMeter,
	type PortfolioSegment
} from '@/core/lib/utils/dashboards/project-budget';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { budgetNotesOf, costBudgetsLabelOf, MISSING_FIGURE, remainingLabelOf, shareTextOf } from './budget-cells';
import { projectToneOf } from './budget-project-tone';

type Translate = ReturnType<typeof useTranslations>;

const SEGMENT_GAP_PX = 2;

const ROW = 'flex flex-col gap-2.5 px-4 py-2.5';

const LABEL = 'text-xs text-muted-foreground';

const TRACK = 'relative h-3 w-full rounded-[3px]';

function portfolioLabelOf(total: BudgetTotal, t: Translate) {
	if (isHoursBudget(total)) {
		return t('dashboard.projectBudget.HOURS_BUDGETS');
	}
	return costBudgetsLabelOf(total, t);
}

function remainingToneOf(total: BudgetTotal) {
	const isOver = total.remaining < 0;
	if (isOver) {
		return 'text-destructive-ink';
	}
	return 'text-foreground';
}

function segmentStyleOf(segment: PortfolioSegment): CSSProperties {
	const backgroundColor = projectToneOf(segment.project);
	const insetInlineStart = `${segment.start}%`;
	const width = `max(0px, calc(${segment.width}% - ${SEGMENT_GAP_PX}px))`;
	return { backgroundColor, insetInlineStart, width };
}

function budgetMarkStyleOf(budgetEnd: number): CSSProperties {
	return { insetInlineStart: `calc(${budgetEnd}% - 1px)` };
}

/** Each project's spent one segment in its own colour, the unused budget a pale track; past it, a rule marks 100%. */
function PortfolioBar({ meter }: Readonly<{ meter: PortfolioMeter }>) {
	return (
		<div aria-hidden="true" className={cn(TRACK, 'bg-foreground/[0.07]')}>
			{meter.segments.map((segment) => (
				<span key={segment.key} className="absolute inset-y-0 rounded-[3px]" style={segmentStyleOf(segment)} />
			))}
			{meter.isOver && (
				<span
					className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
					style={budgetMarkStyleOf(meter.budgetEnd)}
				/>
			)}
		</div>
	);
}

function PortfolioLegend({ meter }: Readonly<{ meter: PortfolioMeter }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const hasLegend = meter.legend.length > 0;
	const hasOthers = meter.otherCount > 0;
	if (!hasLegend) {
		return null;
	}
	return (
		<ul className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
			{meter.legend.map((segment) => (
				<li key={segment.key} className="flex min-w-0 max-w-full items-center gap-1.5">
					<span
						aria-hidden="true"
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: projectToneOf(segment.project) }}
					/>
					<span className="max-w-40 truncate text-foreground">{segment.project.name}</span>
					<span className="shrink-0 tabular-nums text-muted-foreground">
						{amountTextOf(segment.spent, meter.total, locale)}
					</span>
				</li>
			))}
			{hasOthers && (
				<li className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
					<span>{t('dashboard.projectBudget.PORTFOLIO_OTHERS', { count: meter.otherCount })}</span>
					<span className="tabular-nums">{amountTextOf(meter.otherSpent, meter.total, locale)}</span>
				</li>
			)}
		</ul>
	);
}

const PortfolioMeterRow = memo(function PortfolioMeterRow({ meter }: Readonly<{ meter: PortfolioMeter }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const total = meter.total;
	const label = portfolioLabelOf(total, t);
	const countText = t('dashboard.projectBudget.PROJECTS_COUNT', { count: total.projectCount });
	const spentText = amountTextOf(total.spent, total, locale);
	const budgetText = budgetTextOf(total.budget, total, locale);
	const share = shareTextOf(total);
	const usedText = t('dashboard.projectBudget.USED_SHARE', { share });
	const remainingText = remainingLabelOf(total, locale, t);

	return (
		<li className={ROW}>
			<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
				<div className="flex min-w-0 flex-col gap-0.5">
					<p className="flex min-w-0 items-baseline gap-1.5 text-xs">
						<span className="truncate text-muted-foreground">{label}</span>
						<span aria-hidden="true" className="text-muted-foreground">
							·
						</span>
						<span className="shrink-0 tabular-nums text-muted-foreground">{countText}</span>
					</p>
					<p className="flex min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums">
						<span className="text-lg font-semibold text-foreground">{spentText}</span>
						<span className="text-[13px] text-muted-foreground">{`/ ${budgetText}`}</span>
					</p>
				</div>
				<p className="flex items-baseline gap-1.5 text-xs tabular-nums">
					<span className={limitVerdictTextClassOf(total.verdict)}>{usedText}</span>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<span className={remainingToneOf(total)}>{remainingText}</span>
				</p>
			</div>
			<PortfolioBar meter={meter} />
			<PortfolioLegend meter={meter} />
		</li>
	);
});

/** A unit with no budget keeps its row: a dash and why, over an empty slot. */
function PortfolioPlaceholderRow({ label, hint }: Readonly<{ label: string; hint: string }>) {
	return (
		<li className={ROW}>
			<div className="flex flex-col gap-0.5">
				<p className={LABEL}>{label}</p>
				<p className="text-lg font-semibold text-muted-foreground">{MISSING_FIGURE}</p>
			</div>
			<div aria-hidden="true" className={cn(TRACK, 'hairline-border border-dashed border-foreground/15')} />
			<p className={LABEL}>{hint}</p>
		</li>
	);
}

const SKELETON_ROWS = ['hours', 'cost'];

export function ProjectBudgetPortfolioSkeleton() {
	const t = useTranslations();
	return (
		<section aria-label={t('dashboard.projectBudget.FIGURES_LABEL')} aria-busy="true" className={DASHBOARD_SURFACE}>
			<ul aria-hidden="true" className="flex flex-col py-1">
				{SKELETON_ROWS.map((key) => (
					<li key={key} className={ROW}>
						<div className="flex flex-col gap-2">
							<span className={cn('h-2 w-36', SKELETON_BAR)} />
							<span className={cn('h-4 w-28', SKELETON_BAR)} />
						</div>
						<span className={cn(TRACK, 'block bg-foreground/[0.05]')} />
						<span className={cn('h-2 w-1/2', SKELETON_BAR)} />
					</li>
				))}
			</ul>
		</section>
	);
}

export interface ProjectBudgetPortfolioProps {
	meters: ReadonlyArray<PortfolioMeter>;
	figures: BudgetFigures;
	scope: BudgetScope;
	isLoading: boolean;
}

/** The portfolio: one meter per unit, hours first, then each currency on its own; they are never added together. */
export function ProjectBudgetPortfolio({ meters, figures, scope, isLoading }: Readonly<ProjectBudgetPortfolioProps>) {
	const t = useTranslations();
	if (isLoading) {
		return <ProjectBudgetPortfolioSkeleton />;
	}
	const hoursMeter = meters.find((meter) => isHoursBudget(meter.total));
	const costMeters = meters.filter((meter) => !isHoursBudget(meter.total));
	const hasCostMeters = costMeters.length > 0;
	const notes = budgetNotesOf(figures, scope, t);
	const hasNotes = notes.length > 0;
	const label = t('dashboard.projectBudget.FIGURES_LABEL');

	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<ul className="flex flex-col py-1">
				{hoursMeter && <PortfolioMeterRow meter={hoursMeter} />}
				{!hoursMeter && (
					<PortfolioPlaceholderRow
						label={t('dashboard.projectBudget.HOURS_BUDGETS')}
						hint={t('dashboard.projectBudget.NO_HOURS_BUDGET')}
					/>
				)}
				{costMeters.map((meter) => (
					<PortfolioMeterRow key={meter.total.key} meter={meter} />
				))}
				{!hasCostMeters && (
					<PortfolioPlaceholderRow
						label={t('dashboard.projectBudget.COST_BUDGETS')}
						hint={t('dashboard.projectBudget.NO_COST_BUDGET')}
					/>
				)}
			</ul>
			{hasNotes && <p className="px-4 pt-1 pb-3 text-xs text-muted-foreground text-pretty">{notes.join(' ')}</p>}
		</section>
	);
}
