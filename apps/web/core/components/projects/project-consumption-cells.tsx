'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Skeleton } from '@/core/components/common/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import {
	BudgetMeter,
	shareTextOf,
	SpentOfBudget,
	verdictKeyOf
} from '@/core/components/dashboards/project-budget/budget-cells';
import { Alert } from '@/core/components/icons';
import { MUTED_VALUE, ProjectBudgetCell } from '@/core/components/projects/project-cells';
import type { ProjectConsumptionState } from '@/core/hooks/projects/use-project-consumption';
import { cn } from '@/core/lib/helpers';
import { amountTextOf, budgetTextOf, type BudgetRow } from '@/core/lib/utils/dashboards/project-budget';
import {
	budgetUseOf,
	CONSUMPTION_SCOPE,
	hasProjectBudget,
	timeSpentOf,
	timeSpentTextOf
} from '@/core/lib/utils/project-consumption';
import type { TOrganizationProject } from '@/core/types/schemas';

type BudgetedProject = Pick<TOrganizationProject, 'id' | 'budget' | 'budgetType' | 'currency'>;

const SKELETON_BAR = 'bg-foreground/[0.06]';

function TimeAsCost() {
	const t = useTranslations();
	return (
		<Tooltip>
			<TooltipTrigger render={<span className={cn(MUTED_VALUE, 'truncate')} />}>
				{t('pages.projects.consumption.AS_COST')}
			</TooltipTrigger>
			<TooltipContent>{t('pages.projects.consumption.AS_COST_HINT')}</TooltipContent>
		</Tooltip>
	);
}

export function ProjectTimeSpentCell({
	projectId,
	consumption
}: Readonly<{ projectId: string; consumption: ProjectConsumptionState }>) {
	const locale = useLocale();
	if (consumption.isLoading) {
		return <Skeleton className={cn('h-3 w-14 rounded-full', SKELETON_BAR)} />;
	}
	const row = consumption.rowOf(projectId);
	const timeSpent = timeSpentOf(row);
	if (timeSpent.kind === 'asCost') {
		return <TimeAsCost />;
	}
	if (timeSpent.hours === null) {
		return <span className={MUTED_VALUE}>-</span>;
	}
	const timeText = timeSpentTextOf(timeSpent.hours, locale);
	return <span className="truncate text-[13px] font-medium tabular-nums text-foreground">{timeText}</span>;
}

function shareToneOf(row: BudgetRow) {
	if (row.verdict === 'within') {
		return 'text-foreground';
	}
	return limitVerdictTextClassOf(row.verdict);
}

function amountsTextOf(row: BudgetRow, locale: string) {
	const spentText = amountTextOf(row.spent, row, locale);
	const budgetText = budgetTextOf(row.budget, row, locale);
	return `${spentText} / ${budgetText}`;
}

/**
 * Past the budget a mark joins the share, so the colour is never the only sign of it. The amounts carry their whole
 * text as a title: a long pair, such as two amounts with a currency code, is cut by the cell.
 */
function ProjectBudgetUse({ row }: Readonly<{ row: BudgetRow }>) {
	const t = useTranslations();
	const locale = useLocale();
	const isOver = row.verdict === 'over';
	const shareText = shareTextOf(row);
	const shareTone = shareToneOf(row);
	const verdictKey = verdictKeyOf(row, row.risk, CONSUMPTION_SCOPE);
	const verdictText = t(verdictKey);
	const amountsText = amountsTextOf(row, locale);
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-1">
			<span title={amountsText} className="flex min-w-0">
				<SpentOfBudget amounts={row} className="text-xs" />
			</span>
			<span className="flex min-w-0 items-center gap-2">
				<BudgetMeter amounts={row} className="h-2 min-w-10" />
				<span className={cn('flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums', shareTone)}>
					{isOver && <Alert aria-hidden="true" className="size-3.5" />}
					{shareText}
				</span>
				<span className="sr-only">{verdictText}</span>
			</span>
		</span>
	);
}

/** Without a budget, without the right to read its use, or when the read failed, the cell stays the plain budget. */
export function ProjectBudgetUseCell({
	project,
	consumption
}: Readonly<{ project: BudgetedProject; consumption: ProjectConsumptionState }>) {
	const isWaitingForUse = consumption.isLoading && hasProjectBudget(project);
	if (isWaitingForUse) {
		return (
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<ProjectBudgetCell project={project} />
				<Skeleton className={cn('h-2 w-full rounded-[2px]', SKELETON_BAR)} />
			</span>
		);
	}
	const row = consumption.rowOf(project.id);
	const budgetUse = budgetUseOf(row);
	if (!budgetUse) {
		return <ProjectBudgetCell project={project} />;
	}
	return <ProjectBudgetUse row={budgetUse} />;
}

/** Where the budget cell is not shown (the list on a narrow screen): a mark on a project near or over its budget. */
export function ProjectBudgetRiskMark({
	projectId,
	consumption
}: Readonly<{ projectId: string; consumption: ProjectConsumptionState }>) {
	const t = useTranslations();
	const row = consumption.rowOf(projectId);
	const budgetUse = budgetUseOf(row);
	if (!budgetUse) {
		return null;
	}
	if (budgetUse.verdict === 'within') {
		return null;
	}
	const verdictKey = verdictKeyOf(budgetUse, budgetUse.risk, CONSUMPTION_SCOPE);
	const label = t(verdictKey);
	const tone = limitVerdictTextClassOf(budgetUse.verdict);
	return (
		<span role="img" aria-label={label} title={label} className={cn('flex shrink-0', tone)}>
			<Alert aria-hidden="true" className="size-4" />
		</span>
	);
}
