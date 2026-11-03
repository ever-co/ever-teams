'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import {
	type BudgetGroup,
	type BudgetRisk,
	type BudgetRow,
	type BudgetScope,
	type BudgetTotal
} from '@/core/lib/utils/dashboards/project-budget';
import { BudgetFigureCells, ProjectMark, ProjectName, riskLabelKeyOf, RiskDot, totalLabelOf } from './budget-cells';
import { BUDGET_GRID, BUDGET_ROW_HEIGHT, DESKTOP_CELL, MOBILE_CELL } from './project-budget-grid';

type Translate = ReturnType<typeof useTranslations>;

const PROJECTS_PATH = '/projects';

const ROW_LEAD = 'min-w-0 pl-6';

const COUNT_CHIP =
	'inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

function projectPathOf(projectId: string) {
	return `${PROJECTS_PATH}/${projectId}`;
}

const ProjectBudgetRow = memo(function ProjectBudgetRow({
	row,
	scope
}: Readonly<{ row: BudgetRow; scope: BudgetScope }>) {
	return (
		<div
			role="row"
			className={cn(
				BUDGET_GRID,
				BUDGET_ROW_HEIGHT,
				'relative transition-colors hover:bg-foreground/[0.025] has-[a:focus-visible]:bg-foreground/[0.04]'
			)}
		>
			<span role="cell" className={cn(ROW_LEAD, 'flex items-center gap-2.5')}>
				<ProjectMark project={row.project} />
				<Link
					href={projectPathOf(row.project.id)}
					prefetch={false}
					className="min-w-0 rounded-sm outline-none after:absolute after:inset-0 focus-visible:underline"
				>
					<ProjectName row={row} />
				</Link>
			</span>
			<BudgetFigureCells amounts={row} risk={row.risk} scope={scope} />
		</div>
	);
});

const ProjectBudgetGroupBlock = memo(function ProjectBudgetGroupBlock({
	group,
	scope,
	isOpen,
	onToggle
}: Readonly<{
	group: BudgetGroup;
	scope: BudgetScope;
	isOpen: boolean;
	onToggle: (risk: BudgetRisk, wasOpen: boolean) => void;
}>) {
	const t = useTranslations();
	const handleToggle = useCallback(() => onToggle(group.risk, isOpen), [group.risk, isOpen, onToggle]);
	const labelKey = riskLabelKeyOf(group.risk, scope);
	const header = (
		<span role="cell" className="flex min-w-0 items-center gap-2">
			<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
				<RiskDot risk={group.risk} />
				<span className="truncate">{t(labelKey)}</span>
				<span className={COUNT_CHIP}>{group.rows.length}</span>
			</GroupToggle>
		</span>
	);
	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={BUDGET_GRID}>
			<div className="hairline-divide-y divide-border">
				{group.rows.map((row) => (
					<ProjectBudgetRow key={row.key} row={row} scope={scope} />
				))}
			</div>
		</ReportGroup>
	);
});

function TableHeader() {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={BUDGET_GRID}>
			<span role="columnheader" className={ROW_LEAD}>
				{t('dashboard.projectBudget.COLUMN_PROJECT')}
			</span>
			<span role="columnheader" className={DESKTOP_CELL}>
				{t('dashboard.projectBudget.COLUMN_TYPE')}
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('dashboard.projectBudget.COLUMN_BUDGET')}
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('dashboard.projectBudget.COLUMN_SPENT')}
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('dashboard.projectBudget.COLUMN_REMAINING')}
			</span>
			<span role="columnheader" className={DESKTOP_CELL}>
				{t('dashboard.projectBudget.COLUMN_USED')}
			</span>
			<span role="columnheader" className={cn('text-right', MOBILE_CELL)}>
				{t('dashboard.projectBudget.COLUMN_USED')}
			</span>
		</ReportHeaderRow>
	);
}

/** One closing row per unit: hours together, and each currency on its own, never added to another. */
function TotalsRows({ totals, scope }: Readonly<{ totals: ReadonlyArray<BudgetTotal>; scope: BudgetScope }>) {
	const t = useTranslations();
	return (
		<>
			{totals.map((total) => (
				<ReportTotalsRow key={total.key} gridClassName={BUDGET_GRID}>
					<span role="cell" className="flex min-w-0 items-baseline gap-2">
						<span className="truncate">{totalLabelOf(total, t)}</span>
						<span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
							{t('dashboard.projectBudget.PROJECTS_COUNT', { count: total.projectCount })}
						</span>
					</span>
					<BudgetFigureCells amounts={total} risk={null} scope={scope} />
				</ReportTotalsRow>
			))}
		</>
	);
}

function isOpenByDefault(risk: BudgetRisk) {
	return risk !== 'noBudget';
}

function isGroupOpen(overrides: Readonly<Partial<Record<BudgetRisk, boolean>>>, risk: BudgetRisk) {
	const override = overrides[risk];
	if (typeof override === 'boolean') {
		return override;
	}
	return isOpenByDefault(risk);
}

function useGroupOpenState() {
	const [overrides, setOverrides] = useState<Partial<Record<BudgetRisk, boolean>>>({});

	const toggle = useCallback((risk: BudgetRisk, wasOpen: boolean) => {
		setOverrides((current) => ({ ...current, [risk]: !wasOpen }));
	}, []);

	const setAll = useCallback((risks: ReadonlyArray<BudgetRisk>, isOpen: boolean) => {
		const next: Partial<Record<BudgetRisk, boolean>> = {};
		for (const risk of risks) {
			next[risk] = isOpen;
		}
		setOverrides(next);
	}, []);

	return { overrides, toggle, setAll };
}

function toggleAllLabelOf(areAllOpen: boolean, t: Translate) {
	if (areAllOpen) {
		return t('dashboard.projectBudget.COLLAPSE_ALL');
	}
	return t('dashboard.projectBudget.EXPAND_ALL');
}

export function NoBudgetMessage() {
	const t = useTranslations();
	return (
		<BlockEmptyMessage
			title={t('dashboard.projectBudget.EMPTY_TITLE')}
			message={t('dashboard.projectBudget.EMPTY_MESSAGE')}
			action={
				<Button asChild variant="outline" size="default">
					<Link href={PROJECTS_PATH} prefetch={false}>
						{t('dashboard.projectBudget.GO_TO_PROJECTS')}
					</Link>
				</Button>
			}
		/>
	);
}

export function FilteredEmptyMessage({ onClearFilters }: Readonly<{ onClearFilters: () => void }>) {
	const t = useTranslations();
	return (
		<BlockEmptyMessage
			title={t('dashboard.projectBudget.FILTERED_EMPTY_TITLE')}
			message={t('dashboard.projectBudget.FILTERED_EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onClearFilters}>
					{t('common.CLEAR_FILTERS')}
				</Button>
			}
		/>
	);
}

const SKELETON_ROWS = [72, 60, 66, 52, 58, 46];

function BudgetRowsSkeleton() {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_ROWS.map((nameWidth, index) => (
				<div key={index} className={cn(BUDGET_GRID, 'min-h-12')}>
					<span className={cn(ROW_LEAD, 'flex items-center gap-2.5')}>
						<span className="size-5 shrink-0 rounded-[28%] bg-foreground/6" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${nameWidth}%` }} />
					</span>
					<span className={cn('h-2.5 w-12', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('ml-auto h-2.5 w-16', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('flex items-center gap-3', DESKTOP_CELL)}>
						<span className="h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/5" />
						<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
					</span>
					<span className={cn('ml-auto h-2.5 w-8', SKELETON_BAR, MOBILE_CELL)} />
					<span className="col-span-2 flex items-center gap-3 lg:hidden">
						<span className="h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/5" />
						<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
					</span>
				</div>
			))}
		</div>
	);
}

export function ProjectBudgetTableSkeleton() {
	const t = useTranslations();
	const title = t('dashboard.projectBudget.SECTION_PROJECTS');
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<TableHeader />
				<BudgetRowsSkeleton />
			</div>
		</DashboardSection>
	);
}

export interface ProjectBudgetTableProps {
	groups: ReadonlyArray<BudgetGroup>;
	totals: ReadonlyArray<BudgetTotal>;
	scope: BudgetScope;
	projectCount: number;
	hasBudgetedProject: boolean;
	isFiltered: boolean;
	isLoading: boolean;
	isUpdating: boolean;
	onClearFilters: () => void;
}

export function ProjectBudgetTable({
	groups,
	totals,
	scope,
	projectCount,
	hasBudgetedProject,
	isFiltered,
	isLoading,
	isUpdating,
	onClearFilters
}: Readonly<ProjectBudgetTableProps>) {
	const t = useTranslations();
	const { overrides, toggle, setAll } = useGroupOpenState();
	const hasGroups = groups.length > 0;
	const canToggleAll = groups.length > 1;
	const areAllOpen = groups.every((group) => isGroupOpen(overrides, group.risk));
	const showsNoBudget = !hasBudgetedProject && !isFiltered;
	const showsFilteredEmpty = isFiltered && !hasGroups;
	const hasTotals = totals.length > 0;
	const showsTotals = hasGroups && hasTotals;
	const title = t('dashboard.projectBudget.SECTION_PROJECTS');
	const meta = t('dashboard.projectBudget.PROJECTS_COUNT', { count: projectCount });

	const toggleAll = () => {
		const risks = groups.map((group) => group.risk);
		setAll(risks, !areAllOpen);
	};

	if (isLoading) {
		return <ProjectBudgetTableSkeleton />;
	}

	const actions = canToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabelOf(areAllOpen, t)}
		</Button>
	);

	return (
		<DashboardSection title={title} meta={meta} actions={actions} ariaLabel={title}>
			<div role="table" aria-busy={isUpdating}>
				<TableHeader />
				{showsNoBudget && <NoBudgetMessage />}
				{showsFilteredEmpty && <FilteredEmptyMessage onClearFilters={onClearFilters} />}
				{hasGroups && (
					<div className="hairline-divide-y divide-border">
						{groups.map((group) => (
							<ProjectBudgetGroupBlock
								key={group.risk}
								group={group}
								scope={scope}
								isOpen={isGroupOpen(overrides, group.risk)}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
				{showsTotals && <TotalsRows totals={totals} scope={scope} />}
			</div>
		</DashboardSection>
	);
}
