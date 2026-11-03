'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { DASHBOARD_SURFACE, NUMBER_CELL, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { ArrowUpRight, ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { DailyReportTask } from '@/core/lib/utils/daily-report-figures';
import { formatDurationShort, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import {
	type ChartGranularity,
	localDateOfKey,
	type ProjectShareItem,
	type RosterMember,
	type StripColumn,
	timesheetPathOf
} from '@/core/lib/utils/dashboards/team';
import { MemberFace, ProjectMark } from './team-marks';
import { type SlotFormats, slotLabelsOf } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

const SHOWN_TASKS = 8;

const DETAIL_ROW = 'grid min-h-8 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4';

const DETAIL_LABEL = 'px-4 pt-2.5 pb-1 text-xs font-medium text-muted-foreground';

const STRIP_LABEL_KEYS = {
	day: 'dashboard.team.roster.STRIP_DAY',
	week: 'dashboard.team.roster.STRIP_WEEK',
	month: 'dashboard.team.roster.STRIP_MONTH'
} as const;

function memberNameOf(name: string, t: Translate) {
	if (name) {
		return name;
	}
	return t('dashboard.team.UNNAMED_MEMBER');
}

function taskTitleOf(task: DailyReportTask, t: Translate) {
	if (task.title) {
		return task.title;
	}
	return t('dashboard.team.table.NO_TASK');
}

function projectNameOf(project: ProjectShareItem, t: Translate) {
	if (project.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return project.name || t('dashboard.team.projects.NONE');
}

function highestSecondsOf(columns: ReadonlyArray<StripColumn>) {
	let highest = 0;
	for (const column of columns) {
		highest = Math.max(highest, column.seconds);
	}
	return highest;
}

function columnToneOf(column: StripColumn, peakKey: string | null) {
	if (column.isFuture) {
		return 'bg-transparent';
	}
	if (column.seconds <= 0) {
		return 'bg-foreground/10';
	}
	if (column.key === peakKey) {
		return 'bg-foreground';
	}
	return 'bg-foreground/20';
}

/** With a tone the worked columns take it, the peak in full and the others lighter; without one they stay grey. */
function columnStyleOf(column: StripColumn, highest: number, peakKey: string | null, tone: string | undefined) {
	const height = columnHeightOf(column, highest);
	const isWorked = column.seconds > 0;
	const isPast = !column.isFuture;
	const hasTone = Boolean(tone);
	const isPastWork = isWorked && isPast;
	const isToned = hasTone && isPastWork;
	if (!isToned) {
		return { height };
	}
	const isPeak = column.key === peakKey;
	if (isPeak) {
		return { height, backgroundColor: tone };
	}
	return { height, backgroundColor: tone, opacity: 0.45 };
}

function columnHeightOf(column: StripColumn, highest: number) {
	const isWorked = column.seconds > 0;
	const hasScale = highest > 0;
	if (!isWorked || !hasScale) {
		return '2px';
	}
	const share = percentOf(column.seconds, highest);
	return `max(2px, ${share}%)`;
}

export function MicroColumns({
	columns,
	peakKey,
	granularity,
	formats,
	periodDays,
	tone
}: Readonly<{
	columns: ReadonlyArray<StripColumn>;
	peakKey: string | null;
	granularity: ChartGranularity;
	formats: SlotFormats;
	periodDays: number;
	tone?: string;
}>) {
	const t = useTranslations();
	const highest = highestSecondsOf(columns);
	const first = columns[0];
	const last = columns[columns.length - 1];
	const hasSeveral = columns.length > 1;
	let firstLabel = '';
	let lastLabel = '';
	if (first) {
		const firstLabels = slotLabelsOf(first.start, granularity, formats, periodDays, t);
		firstLabel = firstLabels.axisLabel;
	}
	if (last && hasSeveral) {
		const lastLabels = slotLabelsOf(last.start, granularity, formats, periodDays, t);
		lastLabel = lastLabels.axisLabel;
	}
	const pastColumns = columns.filter((column) => !column.isFuture);
	return (
		<div className="flex flex-col gap-1">
			<div aria-hidden="true" className="flex h-8 items-end justify-between gap-[3px]">
				{columns.map((column) => (
					<span
						key={column.key}
						className={cn('max-w-6 flex-1 rounded-[2px]', columnToneOf(column, peakKey))}
						style={columnStyleOf(column, highest, peakKey, tone)}
					/>
				))}
			</div>
			<div aria-hidden="true" className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
				<span>{firstLabel}</span>
				<span>{lastLabel}</span>
			</div>
			<ul className="sr-only" aria-label={t(STRIP_LABEL_KEYS[granularity])}>
				{pastColumns.map((column) => {
					const labels = slotLabelsOf(column.start, granularity, formats, periodDays, t);
					return (
						<li key={column.key}>
							{labels.label}: {formatDurationShort(column.seconds)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function projectChipStyleOf(project: ProjectShareItem) {
	if (project.isNoProject) {
		return undefined;
	}
	if (!isPaintableColor(project.color)) {
		return undefined;
	}
	return dataColorChipStyle(project.color);
}

function projectChipToneOf(project: ProjectShareItem) {
	const hasColor = isPaintableColor(project.color);
	const isNeutral = project.isNoProject || !hasColor;
	if (isNeutral) {
		return '[--chip:hsl(var(--muted-foreground))]';
	}
	return undefined;
}

function TopProjectChip({ project, memberSeconds }: Readonly<{ project: ProjectShareItem; memberSeconds: number }>) {
	const t = useTranslations();
	const name = projectNameOf(project, t);
	const share = percentOf(project.seconds, memberSeconds);
	return (
		<span className="flex min-w-0">
			<span className="sr-only">{t('dashboard.team.figures.TOP_PROJECT', { name })}</span>
			<span
				aria-hidden="true"
				className={cn(
					'chip-3d inline-flex h-6 min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium',
					projectChipToneOf(project)
				)}
				style={projectChipStyleOf(project)}
			>
				<ProjectMark imageUrl={project.imageUrl} color={project.color} isNoProject={project.isNoProject} />
				<span className="truncate">{name}</span>
				<span className="shrink-0 tabular-nums opacity-70">{formatPercent(share)}</span>
			</span>
		</span>
	);
}

function MemberTasks({
	tasks,
	memberSeconds
}: Readonly<{ tasks: ReadonlyArray<DailyReportTask>; memberSeconds: number }>) {
	const t = useTranslations();
	const [showsAll, setShowsAll] = useState(false);
	const hiddenCount = Math.max(tasks.length - SHOWN_TASKS, 0);
	const hasHidden = hiddenCount > 0;
	const showsMoreButton = hasHidden && !showsAll;
	let shownTasks = tasks;
	if (!showsAll) {
		shownTasks = tasks.slice(0, SHOWN_TASKS);
	}
	if (tasks.length === 0) {
		return null;
	}
	return (
		<>
			<div className={DETAIL_LABEL}>{t('dashboard.team.table.TASKS')}</div>
			<ul>
				{shownTasks.map((task) => {
					const title = taskTitleOf(task, t);
					const share = percentOf(task.seconds, memberSeconds);
					return (
						<li key={task.key} className={DETAIL_ROW}>
							<span className="min-w-0 truncate text-[13px] text-foreground" title={title}>
								{title}
							</span>
							<span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
								{formatPercent(share)}
							</span>
							<span className={NUMBER_CELL}>{formatDurationShort(task.seconds)}</span>
						</li>
					);
				})}
			</ul>
			{showsMoreButton && (
				<div className="px-4 pt-1">
					<button
						type="button"
						onClick={() => setShowsAll(true)}
						className="-mx-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{t('dashboard.team.table.MORE_TASKS', { count: hiddenCount })}
					</button>
				</div>
			)}
		</>
	);
}

function MemberDetail({ member, formats }: Readonly<{ member: RosterMember; formats: SlotFormats }>) {
	const t = useTranslations();
	const { summary } = member;
	return (
		<div className="pb-3">
			<div className={DETAIL_LABEL}>{t('dashboard.team.table.DAYS_WORKED')}</div>
			<ul>
				{summary.days.map((day) => {
					const date = localDateOfKey(day.dateKey);
					return (
						<li key={day.key} className={DETAIL_ROW}>
							<span className="min-w-0 truncate text-[13px] text-foreground">
								{formats.dayShort.format(date)}
							</span>
							<ActivityFigure percent={day.activity} />
							<span className={NUMBER_CELL}>{formatDurationShort(day.seconds)}</span>
						</li>
					);
				})}
			</ul>
			<MemberTasks tasks={summary.tasks} memberSeconds={summary.seconds} />
		</div>
	);
}

function detailsLabelOf(isOpen: boolean, t: Translate) {
	if (isOpen) {
		return t('dashboard.team.roster.HIDE_DETAILS');
	}
	return t('dashboard.team.roster.SHOW_DETAILS');
}

function MemberName({ name, href }: Readonly<{ name: string; href: string | null }>) {
	const t = useTranslations();
	if (!href) {
		return <span className="truncate">{name}</span>;
	}
	return (
		<Link
			href={href}
			prefetch={false}
			aria-label={t('dashboard.team.roster.OPEN_TIMESHEET', { name })}
			className="flex min-w-0 rounded-sm outline-none after:absolute after:inset-0 after:rounded-t-xl focus-visible:underline"
		>
			<span className="truncate">{name}</span>
		</Link>
	);
}

function timesheetHrefOf(member: RosterMember, name: string, canOpenTimesheet: boolean) {
	const userId = member.userId;
	if (!canOpenTimesheet || !userId) {
		return null;
	}
	return timesheetPathOf(userId, name);
}

export const TeamMemberCard = memo(function TeamMemberCard({
	member,
	canOpenTimesheet,
	granularity,
	formats,
	periodDays
}: Readonly<{
	member: RosterMember;
	canOpenTimesheet: boolean;
	granularity: ChartGranularity;
	formats: SlotFormats;
	periodDays: number;
}>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const { summary, topProject } = member;
	const name = memberNameOf(summary.name, t);
	const href = timesheetHrefOf(member, name, canOpenTimesheet);
	const isLink = Boolean(href);
	const meta = t('dashboard.team.roster.MEMBER_META', { days: summary.dayCount, projects: summary.projectCount });
	return (
		<article className={cn(DASHBOARD_SURFACE, 'flex flex-col')}>
			<div
				className={cn(
					'relative flex flex-col gap-3.5 rounded-t-xl p-4',
					isLink && 'transition-colors hover:bg-foreground/[0.02] has-[a:focus-visible]:bg-foreground/[0.04]'
				)}
			>
				<header className="flex min-w-0 items-center gap-3">
					<MemberFace name={name} imageUrl={summary.imageUrl} className="size-8 text-[11px]" />
					<div className="flex min-w-0 flex-1 flex-col">
						<h3 className="flex min-w-0 text-[13px] font-medium text-foreground">
							<MemberName name={name} href={href} />
						</h3>
						<p className="truncate text-xs text-muted-foreground">{meta}</p>
					</div>
					{isLink && <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
				</header>
				<div className="flex items-end justify-between gap-3">
					<div className="flex min-w-0 flex-col">
						<span className="text-xs text-muted-foreground">{t('dashboard.team.table.TRACKED')}</span>
						<span className="text-lg font-semibold tabular-nums text-foreground">
							{formatDurationShort(summary.seconds)}
						</span>
					</div>
					<div className="flex flex-col items-end gap-1">
						<span className="text-xs text-muted-foreground">{t('dashboard.team.table.ACTIVITY')}</span>
						<ActivityFigure percent={summary.activity} />
					</div>
				</div>
				<MicroColumns
					columns={member.columns}
					peakKey={member.peakColumnKey}
					granularity={granularity}
					formats={formats}
					periodDays={periodDays}
				/>
				{topProject && <TopProjectChip project={topProject} memberSeconds={summary.seconds} />}
			</div>
			<div className="hairline-t border-dashed border-border">
				<button
					type="button"
					aria-expanded={isOpen}
					onClick={() => setIsOpen((current) => !current)}
					className="flex h-9 w-full items-center justify-between gap-2 rounded-b-xl px-4 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.025] hover:text-foreground focus-visible:bg-foreground/[0.04] focus-visible:text-foreground aria-expanded:rounded-b-none"
				>
					<span>{detailsLabelOf(isOpen, t)}</span>
					<ChevronDown
						aria-hidden="true"
						className={cn('size-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
					/>
				</button>
				<AnimatedHeight>{isOpen && <MemberDetail member={member} formats={formats} />}</AnimatedHeight>
			</div>
		</article>
	);
});

const SKELETON_COLUMN_HEIGHTS = [40, 70, 55, 85, 30, 60, 45];

export function TeamMemberCardSkeleton() {
	return (
		<div aria-hidden="true" className={cn(DASHBOARD_SURFACE, 'flex flex-col')}>
			<div className="flex flex-col gap-3.5 p-4">
				<div className="flex items-center gap-3">
					<span className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className="flex flex-1 flex-col gap-1.5">
						<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
						<span className={cn('h-2 w-20', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex items-end justify-between">
					<div className="flex flex-col gap-2">
						<span className={cn('h-2 w-12', SKELETON_BAR)} />
						<span className={cn('h-4 w-20', SKELETON_BAR)} />
					</div>
					<div className="flex flex-col items-end gap-2">
						<span className={cn('h-2 w-12', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex h-8 items-end justify-between gap-[3px]">
						{SKELETON_COLUMN_HEIGHTS.map((height, index) => (
							<span
								key={index}
								className="max-w-6 flex-1 animate-pulse rounded-[2px] bg-foreground/[0.05]"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
					<span className="h-[15px]" />
				</div>
				<span className="h-6 w-32 animate-pulse rounded-md bg-foreground/[0.05]" />
			</div>
			<div className="flex h-9 items-center px-4 hairline-t border-dashed border-border">
				<span className={cn('h-2 w-28', SKELETON_BAR)} />
			</div>
		</div>
	);
}
