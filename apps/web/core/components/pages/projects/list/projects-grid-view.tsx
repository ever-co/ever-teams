'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { Skeleton } from '@/core/components/common/skeleton';
import {
	MUTED_VALUE,
	PeopleCell,
	ProgressRing,
	ProjectDatesCell,
	ProjectStatusChip,
	ProjectTagChips,
	ProjectTile,
	TeamsCell,
	formatProjectDay,
	useProjectBudget
} from '@/core/components/projects/project-cells';
import { FavoriteMark } from '@/core/components/favorites/favorite-parts';
import { ProjectActionsMenu } from '@/core/components/projects/project-actions-menu';
import { ProjectBudgetUseCell } from '@/core/components/projects/project-consumption-cells';
import type { ProjectConsumptionState } from '@/core/hooks/projects/use-project-consumption';
import { hasProjectBudget, timeSpentOf, timeSpentTextOf } from '@/core/lib/utils/project-consumption';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { cn } from '@/core/lib/helpers';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import {
	clientNameOf,
	completionPercentOf,
	statusLabelOf,
	personFromProjectMember,
	plainTextOf,
	realDateOf,
	type ProjectStatusGroup,
	type ProjectTaskStats
} from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

const CARD_GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

const MAX_TAGS = 3;

export function ProjectsGridView({
	list,
	groups,
	statuses,
	taskStats,
	consumption
}: Readonly<{
	list: ProjectsListState;
	groups: ProjectStatusGroup[];
	statuses: TTaskStatus[];
	taskStats: ProjectTaskStatsState;
	consumption: ProjectConsumptionState;
}>) {
	const t = useTranslations();
	const isGrouped = list.grouping === 'status';
	const noStatusLabel = t('pages.projects.list.NO_STATUS');
	return (
		<div className="flex flex-col gap-6">
			{groups.map((group) => (
				<section key={group.key} className="flex flex-col gap-3">
					{isGrouped && (
						<h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
							<span className="capitalize">{statusLabelOf(group.name, noStatusLabel)}</span>
							<span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
								{group.items.length}
							</span>
						</h2>
					)}
					<div className={cn(CARD_GRID, '-mx-2 px-2')}>
						{group.items.map((project) => (
							<ProjectCard
								key={project.id}
								project={project}
								list={list}
								statuses={statuses}
								taskStats={taskStats}
								consumption={consumption}
							/>
						))}
					</div>
				</section>
			))}
		</div>
	);
}

function TaskFigures({ stats }: Readonly<{ stats: ProjectTaskStats }>) {
	const t = useTranslations();
	const figures = [
		{ key: 'total', label: t('common.TASKS'), value: stats.total },
		{ key: 'started', label: t('pages.projects.list.STARTED'), value: stats.started },
		{ key: 'done', label: t('pages.projects.list.DONE'), value: stats.done }
	];
	return (
		<div className="grid grid-cols-3 hairline-divide-x divide-dashed divide-border">
			{figures.map((figure) => (
				<div key={figure.key} className="flex flex-col gap-0.5 px-3 first:pl-0">
					<span className="text-base font-semibold tabular-nums text-foreground">{figure.value}</span>
					<span className="text-xs text-muted-foreground">{figure.label}</span>
				</div>
			))}
		</div>
	);
}

function ProgressBlock({ projectId, taskStats }: Readonly<{ projectId: string; taskStats: ProjectTaskStatsState }>) {
	const t = useTranslations();
	if (!taskStats.hasTeam) {
		return null;
	}
	if (!taskStats.isReady) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-6 w-16 bg-foreground/[0.06]" />
				<Skeleton className="h-3 w-40 bg-foreground/[0.06]" />
			</div>
		);
	}
	const stats = taskStats.statsOf(projectId);
	if (!stats) {
		return (
			<p className={MUTED_VALUE}>
				{t('pages.projects.list.NO_TASKS_IN_TEAM', { team: taskStats.teamName ?? '' })}
			</p>
		);
	}
	const percent = completionPercentOf(stats);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<ProgressRing percent={percent} className="size-5" />
				<span className="text-2xl font-semibold tabular-nums text-foreground">{percent}%</span>
				<span className="text-xs text-muted-foreground">{t('pages.projects.list.COMPLETE')}</span>
			</div>
			<TaskFigures stats={stats} />
		</div>
	);
}

function CardFact({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="min-w-0 truncate text-[13px] font-medium tabular-nums text-foreground">{children}</span>
		</div>
	);
}

function BudgetFact({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const budget = useProjectBudget(project);
	if (!budget) {
		return null;
	}
	return (
		<CardFact label={t('pages.projects.list.COLUMN_BUDGET')}>
			{budget.amount}
			{budget.unit && <span className="ml-0.5 font-normal text-muted-foreground">{budget.unit}</span>}
		</CardFact>
	);
}

function BudgetUseFact({
	project,
	consumption
}: Readonly<{ project: TOrganizationProject; consumption: ProjectConsumptionState }>) {
	const t = useTranslations();
	return (
		<div className="flex w-full min-w-0 flex-col gap-1">
			<span className="text-xs text-muted-foreground">{t('pages.projects.list.COLUMN_BUDGET')}</span>
			<ProjectBudgetUseCell project={project} consumption={consumption} />
		</div>
	);
}

function TimeSpentFact({
	projectId,
	consumption
}: Readonly<{ projectId: string; consumption: ProjectConsumptionState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const row = consumption.rowOf(projectId);
	const timeSpent = timeSpentOf(row);
	if (timeSpent.hours === null) {
		return null;
	}
	const timeText = timeSpentTextOf(timeSpent.hours, locale);
	return <CardFact label={t('common.TIME_SPENT')}>{timeText}</CardFact>;
}

/**
 * The amounts of an hours budget already tell the time spent, so a card writes the time apart only for a project
 * without a budget.
 */
function ConsumptionFacts({
	project,
	consumption
}: Readonly<{ project: TOrganizationProject; consumption: ProjectConsumptionState }>) {
	if (!consumption.isAvailable) {
		return <BudgetFact project={project} />;
	}
	if (hasProjectBudget(project)) {
		return <BudgetUseFact project={project} consumption={consumption} />;
	}
	return <TimeSpentFact projectId={project.id} consumption={consumption} />;
}

function ArchivedFact({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const locale = useLocale();
	const archivedAt = realDateOf(project.archivedAt);
	if (!archivedAt) {
		return null;
	}
	return <CardFact label={t('common.ARCHIVE_AT')}>{formatProjectDay(archivedAt, locale)}</CardFact>;
}

function ProjectCard({
	project,
	list,
	statuses,
	taskStats,
	consumption
}: Readonly<{
	project: TOrganizationProject;
	list: ProjectsListState;
	statuses: TTaskStatus[];
	taskStats: ProjectTaskStatsState;
	consumption: ProjectConsumptionState;
}>) {
	const t = useTranslations();
	const isSelected = list.selectedIds.includes(project.id);
	const client = clientNameOf(project);
	const description = plainTextOf(project.description);
	const tags = project.tags ?? [];
	const people = (project.members ?? []).map(personFromProjectMember);
	const hasDescription = description.length > 0;
	const hasTags = tags.length > 0;
	const eyebrow = client ?? project.code;

	return (
		<article
			className={cn(
				'group/card relative flex flex-col gap-4 rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5 transition-shadow',
				isSelected && 'ring-primary/45 shadow-primary/10'
			)}
		>
			<header className="flex items-start gap-3">
				<ProjectTile project={project} size="xl" />
				<div className="flex min-w-0 flex-1 flex-col">
					{eyebrow && <span className="truncate text-xs text-muted-foreground">{eyebrow}</span>}
					<span className="flex min-w-0 items-center gap-1.5">
						<Link
							href={`/projects/${project.id}`}
							className="truncate rounded-sm text-sm font-semibold text-foreground outline-none transition-colors after:absolute after:inset-0 after:rounded-xl hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							{project.name}
						</Link>
						<FavoriteMark entity={EBaseEntityEnum.OrganizationProject} id={project.id} />
					</span>
				</div>
				<div className="relative z-[1] flex items-center gap-1">
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => list.toggleSelected(project.id)}
						aria-label={t('pages.projects.list.SELECT_PROJECT', { name: project.name })}
						className="mt-1.5"
					/>
					<ProjectActionsMenu project={project} showsViewInfo restoreForEveryone />
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-2">
				<ProjectStatusChip statusName={project.status} statuses={statuses} />
				<ProjectDatesCell startDate={project.startDate} endDate={project.endDate} className="text-xs" />
			</div>

			{hasDescription && <p className="line-clamp-2 text-[13px] text-muted-foreground">{description}</p>}

			<ProgressBlock projectId={project.id} taskStats={taskStats} />

			{hasTags && <ProjectTagChips tags={tags} max={MAX_TAGS} />}

			<footer className="mt-auto flex flex-wrap items-end gap-x-6 gap-y-3 hairline-t border-dashed border-border pt-3">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground">{t('common.MEMBERS')}</span>
					<span className="relative z-[1]">
						<PeopleCell people={people} max={4} />
					</span>
				</div>
				<div className="relative z-[1] flex min-w-0 max-w-40 flex-col gap-1">
					<span className="text-xs text-muted-foreground">{t('common.TEAMS')}</span>
					<TeamsCell teams={project.teams ?? []} max={1} />
				</div>
				<ConsumptionFacts project={project} consumption={consumption} />
				<ArchivedFact project={project} />
			</footer>
		</article>
	);
}
