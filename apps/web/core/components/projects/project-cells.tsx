'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Skeleton } from '@/core/components/common/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import {
	completionPercentOf,
	findStatusByName,
	normalizeStatusName,
	realDateOf,
	type ProjectPerson
} from '@/core/lib/utils/project-list';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';

export const MUTED_VALUE = 'text-[13px] text-muted-foreground/70';

const NEUTRAL_CHIP_COLOR = 'hsl(var(--muted-foreground))';

const TILE_SIZE = {
	sm: 'size-5 text-[9px]',
	md: 'size-6',
	lg: 'size-8 text-[11px] rounded-[9px]',
	xl: 'size-10 text-sm rounded-[11px]'
} as const;

export type ProjectTileSize = keyof typeof TILE_SIZE;

export function ProjectTile({
	project,
	size = 'md',
	className
}: Readonly<{
	project: Pick<TOrganizationProject, 'name' | 'color' | 'imageUrl'>;
	size?: ProjectTileSize;
	className?: string;
}>) {
	return (
		<EntityTile
			name={project.name}
			color={project.color}
			imageUrl={project.imageUrl}
			className={cn(TILE_SIZE[size], className)}
		/>
	);
}

function chipColorOf(status: TTaskStatus | undefined) {
	const color = status?.color;
	if (isPaintableColor(color)) {
		return color;
	}
	return NEUTRAL_CHIP_COLOR;
}

export function ProjectStatusChip({
	statusName,
	statuses,
	className
}: Readonly<{ statusName: string | null | undefined; statuses: TTaskStatus[]; className?: string }>) {
	const t = useTranslations();
	const label = normalizeStatusName(statusName);
	if (!label) {
		return <span className={MUTED_VALUE}>{t('pages.projects.list.NO_STATUS')}</span>;
	}
	const status = findStatusByName(statuses, statusName);
	const color = chipColorOf(status);
	return (
		<span
			style={dataColorChipStyle(color)}
			className={cn(
				'chip-3d inline-flex h-6 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium',
				className
			)}
		>
			<TaskPropertyIcon kind="status" name={statusName} color={status?.color} className="size-3.5" />
			<span className="truncate capitalize">{label}</span>
		</span>
	);
}

const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProgressRing({ percent, className }: Readonly<{ percent: number; className?: string }>) {
	const filled = (percent / 100) * RING_CIRCUMFERENCE;
	const dash = `${filled} ${RING_CIRCUMFERENCE}`;
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" className={cn('size-4 shrink-0 -rotate-90', className)}>
			<circle cx="8" cy="8" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-foreground/10" />
			<circle
				cx="8"
				cy="8"
				r={RING_RADIUS}
				fill="none"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray={dash}
				className="stroke-primary"
			/>
		</svg>
	);
}

/**
 * Done share of the project's tasks in the active team. Nothing is drawn before the team's task pages are all
 * loaded, and no team means no figure, so a partial count never reads as the project's progress.
 */
export function ProjectProgressCell({
	projectId,
	taskStats
}: Readonly<{ projectId: string; taskStats: ProjectTaskStatsState }>) {
	const t = useTranslations();
	if (!taskStats.hasTeam) {
		return <span className={MUTED_VALUE}>-</span>;
	}
	if (!taskStats.isReady) {
		return <Skeleton className="h-3 w-14 rounded-full bg-foreground/[0.06]" />;
	}
	const stats = taskStats.statsOf(projectId);
	if (!stats) {
		return <span className={MUTED_VALUE}>{t('pages.projects.list.NO_TASKS')}</span>;
	}
	const percent = completionPercentOf(stats);
	const hint = t('pages.projects.list.TASKS_DONE_HINT', {
		done: stats.done,
		total: stats.total,
		team: taskStats.teamName ?? ''
	});
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span className="inline-flex items-center gap-2 text-[13px] font-medium tabular-nums text-foreground" />
				}
			>
				<ProgressRing percent={percent} />
				<span>{percent}%</span>
				<span className="font-normal text-muted-foreground">
					{stats.done}/{stats.total}
				</span>
			</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	);
}

export function PeopleCell({
	people,
	max = 3,
	emptyLabel
}: Readonly<{ people: ProjectPerson[]; max?: number; emptyLabel?: ReactNode }>) {
	if (people.length === 0) {
		return <span className={MUTED_VALUE}>{emptyLabel ?? '-'}</span>;
	}
	return <AvatarStack people={people} max={max} />;
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0]);
	return letters.join('').toUpperCase();
}

export function PersonFace({ person, className }: Readonly<{ person: ProjectPerson; className?: string }>) {
	return (
		<Avatar className={cn('size-4 text-[7px] font-medium', className)}>
			<AvatarImage src={person.imageUrl ?? undefined} alt={person.name} />
			<AvatarFallback className="text-[inherit]">{initialsOf(person.name)}</AvatarFallback>
		</Avatar>
	);
}

function isCurrentYear(date: Date) {
	const year = date.getFullYear();
	const currentYear = new Date().getFullYear();
	return year === currentYear;
}

export function formatProjectDay(date: Date, locale: string) {
	const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
	if (!isCurrentYear(date)) {
		options.year = 'numeric';
	}
	return new Intl.DateTimeFormat(locale, options).format(date);
}

export function ProjectDatesCell({
	startDate,
	endDate,
	className
}: Readonly<{
	startDate: TOrganizationProject['startDate'];
	endDate: TOrganizationProject['endDate'];
	className?: string;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const start = realDateOf(startDate);
	const end = realDateOf(endDate);
	const hasStart = Boolean(start);
	const hasEnd = Boolean(end);
	const hasAnyDate = hasStart || hasEnd;
	if (!hasAnyDate) {
		return <span className={MUTED_VALUE}>-</span>;
	}
	const notSet = t('pages.projects.list.NOT_SET');
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-[13px] tabular-nums text-foreground', className)}>
			<DateSide date={start} locale={locale} fallback={notSet} />
			<span aria-hidden="true" className="text-muted-foreground">
				→
			</span>
			<DateSide date={end} locale={locale} fallback={notSet} />
		</span>
	);
}

function DateSide({ date, locale, fallback }: Readonly<{ date: Date | null; locale: string; fallback: string }>) {
	if (!date) {
		return <span className="text-muted-foreground/70">{fallback}</span>;
	}
	return <span>{formatProjectDay(date, locale)}</span>;
}

function formatAmount(locale: string, amount: number, currency: string | null | undefined) {
	if (currency) {
		try {
			return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(
				amount
			);
		} catch {
			return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
		}
	}
	return new Intl.NumberFormat(locale).format(amount);
}

export interface ProjectBudgetValue {
	amount: string;
	unit: string | null;
}

/** Gauzy writes 0 when no budget was entered, so a zero budget reads as unset rather than as a figure. */
export function useProjectBudget(project: Pick<TOrganizationProject, 'budget' | 'budgetType' | 'currency'>) {
	const t = useTranslations();
	const locale = useLocale();
	const budget = project.budget;
	const hasBudget = typeof budget === 'number' && budget > 0;
	if (!hasBudget) {
		return null;
	}
	const isHours = project.budgetType === EProjectBudgetType.HOURS;
	if (isHours) {
		const hours = new Intl.NumberFormat(locale).format(budget);
		const value: ProjectBudgetValue = { amount: hours, unit: t('pages.projects.list.HOURS_UNIT') };
		return value;
	}
	const value: ProjectBudgetValue = { amount: formatAmount(locale, budget, project.currency), unit: null };
	return value;
}

export function ProjectBudgetCell({
	project
}: Readonly<{ project: Pick<TOrganizationProject, 'budget' | 'budgetType' | 'currency'> }>) {
	const budget = useProjectBudget(project);
	if (!budget) {
		return <span className={MUTED_VALUE}>-</span>;
	}
	return (
		<span className="text-[13px] font-medium tabular-nums text-foreground">
			{budget.amount}
			{budget.unit && <span className="ml-0.5 font-normal text-muted-foreground">{budget.unit}</span>}
		</span>
	);
}

type ProjectTeam = NonNullable<TOrganizationProject['teams']>[number];

type ProjectTag = NonNullable<TOrganizationProject['tags']>[number];

export function teamImageOf(team: ProjectTeam) {
	return team?.image?.thumbUrl ?? team?.image?.fullUrl ?? team?.imageUrl ?? null;
}

export function TeamsCell({ teams, max = 2 }: Readonly<{ teams: ProjectTeam[]; max?: number }>) {
	if (teams.length === 0) {
		return <span className={MUTED_VALUE}>-</span>;
	}
	const shown = teams.slice(0, max);
	const remaining = teams.length - shown.length;
	const hasRemaining = remaining > 0;
	return (
		<span className="flex min-w-0 items-center gap-1">
			{shown.map((team) => (
				<span
					key={team?.id ?? team?.name}
					className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md bg-foreground/[0.04] pr-2 pl-1 text-xs text-foreground"
				>
					<EntityTile
						name={team?.name}
						color={team?.color}
						imageUrl={teamImageOf(team)}
						className="size-4 text-[7px]"
					/>
					<span className="truncate">{team?.name}</span>
				</span>
			))}
			{hasRemaining && (
				<span className="inline-flex h-6 shrink-0 items-center rounded-md bg-foreground/[0.04] px-1.5 text-xs tabular-nums text-muted-foreground">
					+{remaining}
				</span>
			)}
		</span>
	);
}

export function ProjectTagChips({ tags, max }: Readonly<{ tags: ProjectTag[]; max?: number }>) {
	const limit = max ?? tags.length;
	const shown = tags.slice(0, limit);
	const remaining = tags.length - shown.length;
	const hasRemaining = remaining > 0;
	return (
		<span className="flex flex-wrap items-center gap-1">
			{shown.map((tag) => (
				<span
					key={tag?.id ?? tag?.name}
					className="inline-flex h-6 max-w-40 items-center gap-1.5 rounded-md bg-foreground/[0.04] px-2 text-xs font-medium text-foreground"
				>
					<span
						className="size-1.5 shrink-0 rounded-full"
						style={{ backgroundColor: tag?.color ?? undefined }}
					/>
					<span className="truncate">{tag?.name}</span>
				</span>
			))}
			{hasRemaining && (
				<span className="inline-flex h-6 items-center rounded-md bg-foreground/[0.04] px-1.5 text-xs tabular-nums text-muted-foreground">
					+{remaining}
				</span>
			)}
		</span>
	);
}
