'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { SECTION_META, SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUpRight } from '@/core/components/icons';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import type { LaneTask, TaskLane } from '@/core/lib/utils/dashboards/team';
import { taskNumberLabel } from '@/core/lib/utils/team-tasks-view';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { MemberFace } from './team-marks';

const BOARD_PATH = '/kanban';

const SHOWN_CARDS = 3;

const SHOWN_ASSIGNEES = 3;

const LANES_ROW = 'flex flex-col gap-3 md:-mx-2 md:flex-row md:overflow-x-auto md:px-2 md:pb-1';

const LANE = 'flex min-w-0 flex-col gap-2 rounded-xl bg-foreground/[0.03] p-2 md:w-60 md:shrink-0';

const CARD =
	'flex flex-col gap-2 rounded-lg bg-card p-2.5 hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

const COUNT_CHIP = 'rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

const SKELETON_LANES = 3;
const SKELETON_LANE_KEYS = Array.from({ length: SKELETON_LANES }, (_, index) => `lane-${index}`);

export function statusLabelOf(status: TTaskStatus) {
	const name = status.name ?? '';
	return name.split('-').join(' ');
}

export function StatusTile({ status }: Readonly<{ status: TTaskStatus }>) {
	const color = status.color;
	const isPainted = isPaintableColor(color);
	let style;
	if (isPaintableColor(color)) {
		style = dataColorChipStyle(color);
	}
	return (
		<span
			aria-hidden="true"
			className={cn(
				'chip-3d flex size-5 shrink-0 items-center justify-center rounded-md [&_[data-slot=task-property-icon]]:size-3.5',
				!isPainted && '[--chip:hsl(var(--muted-foreground))]'
			)}
			style={style}
		>
			<TaskPropertyIcon kind="status" name={status.name} color={status.color} icon={status.icon} />
		</span>
	);
}

interface Assignee {
	key: string;
	name: string;
	imageUrl: string | null;
}

interface AssigneeEmployee {
	id?: string | null;
	fullName?: string | null;
	user?: { name?: string | null; imageUrl?: string | null } | null;
}

function assigneeNameOf(employee: AssigneeEmployee) {
	const fullName = employee.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	return employee.user?.name?.trim() ?? '';
}

function assigneesOf(task: TTask): Assignee[] {
	const assignees: Assignee[] = [];
	for (const member of task.members ?? []) {
		const employee: AssigneeEmployee = member;
		const name = assigneeNameOf(employee);
		assignees.push({ key: employee.id ?? name, name, imageUrl: employee.user?.imageUrl ?? null });
	}
	return assignees;
}

export function AssigneeStack({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const assignees = assigneesOf(task);
	if (assignees.length === 0) {
		return <span className="text-xs text-muted-foreground">{t('common.UNASSIGNED')}</span>;
	}
	const shown = assignees.slice(0, SHOWN_ASSIGNEES);
	const hiddenCount = assignees.length - shown.length;
	const assigneeNames = assignees.map((assignee) => assignee.name);
	const names = assigneeNames.join(', ');
	return (
		<span className="flex items-center">
			<span className="sr-only">{names}</span>
			<span aria-hidden="true" className="flex -space-x-1.5" title={names}>
				{shown.map((assignee) => (
					<MemberFace
						key={assignee.key}
						name={assignee.name}
						imageUrl={assignee.imageUrl}
						className="size-5 text-[9px] ring-2 ring-card"
					/>
				))}
				{hiddenCount > 0 && (
					<span className="z-[1] flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium tabular-nums text-muted-foreground ring-2 ring-card">
						+{hiddenCount}
					</span>
				)}
			</span>
		</span>
	);
}

export function TimeLine({ laneTask }: Readonly<{ laneTask: LaneTask }>) {
	const t = useTranslations();
	const estimate = laneTask.task.estimate ?? 0;
	const hasEstimate = estimate > 0;
	const isWorked = laneTask.seconds > 0;
	if (isWorked && hasEstimate) {
		return (
			<span className="text-xs tabular-nums">
				<span className="font-medium text-foreground">{formatDurationShort(laneTask.seconds)}</span>
				<span className="text-muted-foreground"> / {formatHoursLabel(estimate)}</span>
			</span>
		);
	}
	if (isWorked) {
		return (
			<span className="text-xs font-medium tabular-nums text-foreground">
				{formatDurationShort(laneTask.seconds)}
			</span>
		);
	}
	if (hasEstimate) {
		const value = formatHoursLabel(estimate);
		return (
			<span className="text-xs tabular-nums text-muted-foreground">
				{t('dashboard.team.tasks.ESTIMATE', { value })}
			</span>
		);
	}
	return null;
}

const TaskCard = memo(function TaskCard({ laneTask }: Readonly<{ laneTask: LaneTask }>) {
	const { task } = laneTask;
	const numberLabel = taskNumberLabel(task);
	return (
		<li className={CARD}>
			<TaskDrawerLink
				taskId={task.id}
				prefetch={false}
				className="line-clamp-2 rounded-sm text-[13px] text-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{numberLabel && <span className="mr-1 tabular-nums text-muted-foreground">{numberLabel}</span>}
				{task.title}
			</TaskDrawerLink>
			<div className="flex min-h-5 items-center justify-between gap-2">
				<AssigneeStack task={task} />
				<TimeLine laneTask={laneTask} />
			</div>
		</li>
	);
});

function StatusLane({ lane }: Readonly<{ lane: TaskLane }>) {
	const t = useTranslations();
	const count = lane.tasks.length;
	const shownTasks = lane.tasks.slice(0, SHOWN_CARDS);
	const hiddenCount = count - shownTasks.length;
	const label = statusLabelOf(lane.status);
	return (
		<section aria-label={label} className={LANE}>
			<header className="flex min-h-7 items-center gap-2 px-1">
				<StatusTile status={lane.status} />
				<h3 className="min-w-0 truncate text-[13px] font-semibold capitalize text-foreground">{label}</h3>
				<span className={COUNT_CHIP}>{count}</span>
			</header>
			<ul className="flex flex-col gap-2">
				{shownTasks.map((laneTask) => (
					<TaskCard key={laneTask.task.id} laneTask={laneTask} />
				))}
			</ul>
			{hiddenCount > 0 && (
				<Link
					href={BOARD_PATH}
					prefetch={false}
					className="self-start rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{t('dashboard.team.tasks.MORE', { count: hiddenCount })}
				</Link>
			)}
		</section>
	);
}

function LanesHeader({ meta, actions }: Readonly<{ meta?: string | null; actions?: ReactNode }>) {
	const t = useTranslations();
	return (
		<header className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1">
			<div className="flex min-w-0 items-baseline gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.team.tasks.TITLE')}</h2>
				{meta && <span className={SECTION_META}>{meta}</span>}
			</div>
			{actions}
		</header>
	);
}

function BoardLink() {
	const t = useTranslations();
	return (
		<Button asChild variant="ghost" size="default">
			<Link href={BOARD_PATH} prefetch={false}>
				{t('dashboard.team.tasks.OPEN_BOARD')}
				<ArrowUpRight aria-hidden="true" className="text-muted-foreground" />
			</Link>
		</Button>
	);
}

export function TeamTaskLanesSkeleton() {
	const t = useTranslations();
	return (
		<section aria-label={t('dashboard.team.tasks.TITLE')} aria-busy="true" className="flex min-w-0 flex-col gap-2">
			<LanesHeader />
			<div aria-hidden="true" className={LANES_ROW}>
				{SKELETON_LANE_KEYS.map((laneKey) => (
					<div key={laneKey} className={LANE}>
						<span className="flex min-h-7 items-center gap-2 px-1">
							<span className="size-5 animate-pulse rounded-md bg-foreground/[0.06]" />
							<span className={cn('h-2.5 w-20', SKELETON_BAR)} />
						</span>
						{Array.from({ length: 2 }).map((__, cardIndex) => (
							<span key={cardIndex} className={cn(CARD, 'gap-3')}>
								<span className={cn('h-2.5 w-4/5', SKELETON_BAR)} />
								<span className="flex items-center justify-between">
									<span className="size-5 animate-pulse rounded-full bg-foreground/[0.06]" />
									<span className={cn('h-2 w-12', SKELETON_BAR)} />
								</span>
							</span>
						))}
					</div>
				))}
			</div>
		</section>
	);
}

function laneTaskCountOf(lanes: ReadonlyArray<TaskLane>) {
	let count = 0;
	for (const lane of lanes) {
		count += lane.tasks.length;
	}
	return count;
}

export function TeamTaskLanes({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { lanes, isTasksLoading, isTasksError, refetchStatuses } = dashboard.live;

	if (isTasksLoading) {
		return <TeamTaskLanesSkeleton />;
	}

	const title = t('dashboard.team.tasks.TITLE');
	const taskCount = laneTaskCountOf(lanes);
	const hasLanes = lanes.length > 0;
	let meta: string | null = null;
	if (hasLanes) {
		meta = t('dashboard.team.tasks.COUNT', { count: taskCount });
	}

	let body: ReactNode = (
		<div className={LANES_ROW}>
			{lanes.map((lane) => (
				<StatusLane key={lane.status.id} lane={lane} />
			))}
		</div>
	);
	if (!hasLanes) {
		body = (
			<p className="rounded-xl bg-foreground/[0.03] px-4 py-8 text-center text-[13px] text-muted-foreground text-balance">
				{t('dashboard.team.tasks.EMPTY')}
			</p>
		);
	}
	if (isTasksError) {
		body = <DashboardErrorNotice onRetry={refetchStatuses} />;
	}

	return (
		<section aria-label={title} className="flex min-w-0 flex-col gap-2">
			<LanesHeader meta={meta} actions={<BoardLink />} />
			{body}
		</section>
	);
}
