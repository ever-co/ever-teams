'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { limitVerdictTextClassOf } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Clock, DollarCircle } from '@/core/components/icons';
import { LANE_SURFACE } from '@/core/components/pages/kanban/board/kanban-recipes';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import {
	amountTextOf,
	budgetTextOf,
	isHoursBudget,
	type BudgetLane,
	type BudgetProject,
	type BudgetRow,
	type BudgetScope
} from '@/core/lib/utils/dashboards/project-budget';
import { BudgetPillMeter, BudgetPillMeterSkeleton } from './budget-pill-meter';
import { remainingLabelOf, riskLabelKeyOf, RiskDot, shareTextOf, typeTextOf } from './budget-cells';
import { FilteredEmptyMessage, NoBudgetMessage } from './project-budget-table';

type Translate = ReturnType<typeof useTranslations>;

const PROJECTS_PATH = '/projects';

const LANE_PREVIEW_SIZE = 8;

const MAX_CARD_AVATARS = 4;

const BOARD_GRID = 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4';

const LANE = 'flex min-w-0 flex-col rounded-xl';

const LANE_HEADER = 'flex h-11 shrink-0 items-center gap-2 px-3';

const LANE_BODY = 'flex flex-col gap-2 px-2 pb-2';

const COUNT_CHIP = 'rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

/**
 * Off-screen cards of a long lane skip layout and paint; set on the card itself, so its own hairline and shadow are
 * not clipped by the containment.
 */
const CARD_SURFACE =
	'relative flex min-w-0 flex-col gap-3 rounded-xl bg-card p-3 text-card-foreground hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow [content-visibility:auto] [contain-intrinsic-size:auto_184px] hover:ring-foreground/20 has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/25';

const TYPE_CHIP =
	'chip-3d inline-flex h-5 w-fit max-w-full items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-medium [--chip:hsl(var(--muted-foreground))] [&_svg]:size-3 [&_svg]:shrink-0';

const EMPTY_SLOT =
	'flex min-h-16 items-center justify-center rounded-xl px-3 text-center text-xs text-muted-foreground hairline-border border-dashed border-foreground/15';

const LANE_TOGGLE =
	'flex h-8 w-full items-center justify-center rounded-lg px-2 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function projectPathOf(projectId: string) {
	return `${PROJECTS_PATH}/${projectId}`;
}

function BudgetTypeChip({ row }: Readonly<{ row: BudgetRow }>) {
	const t = useTranslations();
	const isHours = isHoursBudget(row);
	return (
		<span className={TYPE_CHIP}>
			{isHours && <Clock aria-hidden="true" />}
			{!isHours && <DollarCircle aria-hidden="true" />}
			<span className="truncate">{typeTextOf(row, t)}</span>
		</span>
	);
}

function UsedFigure({ row }: Readonly<{ row: BudgetRow }>) {
	const locale = useLocale();
	const spentText = amountTextOf(row.spent, row, locale);
	const budgetText = budgetTextOf(row.budget, row, locale);
	return (
		<p className="flex min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums">
			<span className="text-lg font-semibold text-foreground">{spentText}</span>
			<span className="text-[13px] text-muted-foreground">{`/ ${budgetText}`}</span>
		</p>
	);
}

function shareToneOf(row: BudgetRow) {
	if (row.risk === 'noTime') {
		return 'text-muted-foreground';
	}
	return limitVerdictTextClassOf(row.verdict);
}

function remainingToneOf(row: BudgetRow) {
	const isOver = row.remaining < 0;
	if (isOver) {
		return 'text-destructive-ink';
	}
	return 'text-foreground';
}

function ShareLine({ row }: Readonly<{ row: BudgetRow }>) {
	const t = useTranslations();
	const locale = useLocale();
	const share = shareTextOf(row);
	const usedText = t('dashboard.projectBudget.USED_SHARE', { share });
	const remainingText = remainingLabelOf(row, locale, t);
	return (
		<p className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs tabular-nums">
			<span className={shareToneOf(row)}>{usedText}</span>
			<span className={remainingToneOf(row)}>{remainingText}</span>
		</p>
	);
}

/** Faces only when the projects list carried the members; the count is written once, so the stack shows no "+N". */
function CardPeople({ project }: Readonly<{ project: BudgetProject }>) {
	const t = useTranslations();
	const membersCount = project.membersCount;
	if (typeof membersCount !== 'number') {
		return null;
	}
	const shownPeople = project.people.slice(0, MAX_CARD_AVATARS);
	const hasPeople = shownPeople.length > 0;
	return (
		<div className="flex min-h-6 items-center gap-2 pt-1">
			{hasPeople && (
				<span className="relative z-[1] flex">
					<AvatarStack people={shownPeople} max={MAX_CARD_AVATARS} />
				</span>
			)}
			<span className="truncate text-xs text-muted-foreground">
				{t('dashboard.projectBudget.MEMBERS_COUNT', { count: membersCount })}
			</span>
		</div>
	);
}

const BudgetCard = memo(function BudgetCard({ row }: Readonly<{ row: BudgetRow }>) {
	const project = row.project;
	return (
		<li className={CARD_SURFACE}>
			<div className="flex min-w-0 items-start gap-2.5">
				<span aria-hidden="true" className="flex shrink-0">
					<EntityTile
						name={project.name}
						color={project.color}
						imageUrl={project.imageUrl}
						className="size-7 text-[11px]"
					/>
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<Link
						href={projectPathOf(project.id)}
						prefetch={false}
						className="line-clamp-2 text-[13px] font-medium leading-5 text-foreground outline-none after:absolute after:inset-0 after:rounded-xl"
					>
						{project.name}
					</Link>
					<BudgetTypeChip row={row} />
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<UsedFigure row={row} />
				<BudgetPillMeter amounts={row} />
				<ShareLine row={row} />
			</div>
			<CardPeople project={project} />
		</li>
	);
});

function shownRowsOf(rows: ReadonlyArray<BudgetRow>, isExpanded: boolean) {
	if (isExpanded) {
		return rows;
	}
	return rows.slice(0, LANE_PREVIEW_SIZE);
}

function laneToggleLabelOf(isExpanded: boolean, hiddenCount: number, t: Translate) {
	if (isExpanded) {
		return t('dashboard.projectBudget.LANE_SHOW_FEWER');
	}
	return t('dashboard.projectBudget.LANE_SHOW_MORE', { count: hiddenCount });
}

const BudgetLaneColumn = memo(function BudgetLaneColumn({
	lane,
	scope
}: Readonly<{ lane: BudgetLane; scope: BudgetScope }>) {
	const t = useTranslations();
	const [isExpanded, setIsExpanded] = useState(false);
	const toggle = useCallback(() => setIsExpanded((current) => !current), []);
	const label = t(riskLabelKeyOf(lane.risk, scope));
	const count = lane.rows.length;
	const hasRows = count > 0;
	const hiddenCount = Math.max(count - LANE_PREVIEW_SIZE, 0);
	const canExpand = hiddenCount > 0;
	const shownRows = shownRowsOf(lane.rows, isExpanded);

	return (
		<section aria-label={label} className={cn(LANE, LANE_SURFACE)}>
			<header className={LANE_HEADER}>
				<RiskDot risk={lane.risk} />
				<h2 className="truncate text-[13px] font-semibold text-foreground">{label}</h2>
				<span className={COUNT_CHIP}>{count}</span>
			</header>
			<div className={LANE_BODY}>
				{!hasRows && <p className={EMPTY_SLOT}>{t('dashboard.projectBudget.LANE_EMPTY')}</p>}
				{hasRows && (
					<ul className="flex flex-col gap-2">
						{shownRows.map((row) => (
							<BudgetCard key={row.key} row={row} />
						))}
					</ul>
				)}
				{canExpand && (
					<button type="button" aria-expanded={isExpanded} onClick={toggle} className={LANE_TOGGLE}>
						{laneToggleLabelOf(isExpanded, hiddenCount, t)}
					</button>
				)}
			</div>
		</section>
	);
});

const SKELETON_CARD_COUNTS = [2, 3, 2, 1];

const SKELETON_CARD_KEYS = ['card-1', 'card-2', 'card-3'];

function BudgetCardSkeleton() {
	return (
		<div className="flex flex-col gap-3 rounded-xl bg-card p-3 hairline-ring ring-border">
			<div className="flex items-start gap-2.5">
				<span className="size-7 shrink-0 animate-pulse rounded-[28%] bg-foreground/[0.06]" />
				<div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
					<span className={cn('h-2.5 w-2/3', SKELETON_BAR)} />
					<span className="h-5 w-16 animate-pulse rounded-[5px] bg-foreground/[0.05]" />
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<span className={cn('h-4 w-28', SKELETON_BAR)} />
				<BudgetPillMeterSkeleton />
				<div className="flex justify-between">
					<span className={cn('h-2 w-16', SKELETON_BAR)} />
					<span className={cn('h-2 w-14', SKELETON_BAR)} />
				</div>
			</div>
		</div>
	);
}

/** The board while budgets load: four lanes and cards at their real size, so nothing moves when data arrives. */
export function ProjectBudgetBoardSkeleton() {
	return (
		<div aria-hidden="true" className={BOARD_GRID}>
			{SKELETON_CARD_COUNTS.map((cardCount, laneIndex) => (
				<div key={laneIndex} className={cn(LANE, LANE_SURFACE)}>
					<div className={LANE_HEADER}>
						<span className="size-2 rounded-full bg-foreground/10" />
						<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
						<span className="h-5 w-6 rounded-md bg-foreground/5" />
					</div>
					<div className={LANE_BODY}>
						{SKELETON_CARD_KEYS.slice(0, cardCount).map((key) => (
							<BudgetCardSkeleton key={key} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export interface ProjectBudgetBoardProps {
	lanes: ReadonlyArray<BudgetLane>;
	scope: BudgetScope;
	visibleCount: number;
	hasBudgetedProject: boolean;
	isFiltered: boolean;
	isLoading: boolean;
	isUpdating: boolean;
	onClearFilters: () => void;
}

export function ProjectBudgetBoard({
	lanes,
	scope,
	visibleCount,
	hasBudgetedProject,
	isFiltered,
	isLoading,
	isUpdating,
	onClearFilters
}: Readonly<ProjectBudgetBoardProps>) {
	const t = useTranslations();
	const label = t('dashboard.projectBudget.BOARD_LABEL');
	const showsNoBudget = !hasBudgetedProject && !isFiltered;
	const showsFilteredEmpty = isFiltered && visibleCount === 0;

	if (isLoading) {
		return <ProjectBudgetBoardSkeleton />;
	}
	if (showsNoBudget) {
		return (
			<section aria-label={label} className={DASHBOARD_SURFACE}>
				<NoBudgetMessage />
			</section>
		);
	}
	if (showsFilteredEmpty) {
		return (
			<section aria-label={label} className={DASHBOARD_SURFACE}>
				<FilteredEmptyMessage onClearFilters={onClearFilters} />
			</section>
		);
	}
	return (
		<section aria-label={label} aria-busy={isUpdating} className={BOARD_GRID}>
			{lanes.map((lane) => (
				<BudgetLaneColumn key={lane.risk} lane={lane} scope={scope} />
			))}
		</section>
	);
}
