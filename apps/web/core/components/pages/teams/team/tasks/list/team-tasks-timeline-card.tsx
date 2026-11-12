'use client';

import { useTranslations } from 'next-intl';
import { Calendar } from '@/core/components/icons';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { PersonAvatar, personFromTaskMember, type Person } from '@/core/components/teams/people-avatars';
import { useTaskWorkedSeconds } from '@/core/hooks/tasks/use-task-worked-seconds';
import { cn } from '@/core/lib/helpers';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The faces a bar holds before the rest is counted. */
const FACES_ON_BAR = 3;

/** The names the card lists before the rest is counted. */
const NAMES_IN_CARD = 4;

const FACE_ON_BAR = 'size-4 text-[7px] ring-[1.5px] ring-card';

const CARD_CHIP =
	'inline-flex h-5 max-w-40 items-center gap-1 rounded-[5px] bg-foreground/[0.05] px-1.5 text-[11px] font-medium capitalize text-foreground [&_[data-slot=task-property-icon]]:size-3';

function readableName(value: string | null | undefined) {
	const text = value ?? '';
	return text.split('-').join(' ');
}

function durationOf(seconds: number) {
	const { hours, minutes } = secondsToTime(seconds);
	return `${hours}h ${minutes}m`;
}

/** How much of the estimate was worked, as a share of the bar (never past its end). */
function workedShareOf(workedSeconds: number, estimateSeconds: number) {
	const share = (workedSeconds / estimateSeconds) * 100;
	return Math.min(share, 100);
}

export function StatusGlyph({ status }: Readonly<{ status: TTaskStatus | undefined }>) {
	if (!status) {
		return <TaskPropertyPlaceholderIcon kind="status" />;
	}
	return (
		<TaskPropertyIcon
			kind="status"
			name={status.name}
			color={status.color}
			icon={status.icon}
			iconUrl={status.fullIconUrl}
		/>
	);
}

export function peopleOfTask(task: TTask): Person[] {
	const members = task.members ?? [];
	return members.map(personFromTaskMember);
}

/** The faces of the people a task is assigned to, at the end of its bar: three, then the rest as a count. */
export function BarPeople({ people }: Readonly<{ people: Person[] }>) {
	const shown = people.slice(0, FACES_ON_BAR);
	const remaining = people.length - shown.length;
	const hasRemaining = remaining > 0;
	return (
		<span className="pointer-events-none ml-auto flex shrink-0 items-center -space-x-1" aria-hidden="true">
			{shown.map((person) => (
				<PersonAvatar key={person.id} person={person} className={FACE_ON_BAR} />
			))}
			{hasRemaining && (
				<span className="relative flex size-4 items-center justify-center rounded-full bg-muted text-[8px] font-medium tabular-nums text-muted-foreground ring-[1.5px] ring-card">
					+{remaining}
				</span>
			)}
		</span>
	);
}

function TimeWorked({ taskId, estimateSeconds }: Readonly<{ taskId: string; estimateSeconds: number }>) {
	const t = useTranslations();
	const workedSeconds = useTaskWorkedSeconds(taskId);
	const hasEstimate = estimateSeconds > 0;
	const hasWorked = workedSeconds > 0;
	if (!hasEstimate && !hasWorked) {
		return null;
	}
	let amount = durationOf(workedSeconds);
	if (hasEstimate) {
		amount = `${amount} / ${durationOf(estimateSeconds)}`;
	}
	return (
		<div className="flex flex-col gap-1.5">
			<p className="flex items-center justify-between gap-3 text-xs">
				<span className="text-muted-foreground">{t('common.WORKED')}</span>
				<span className="tabular-nums text-foreground">{amount}</span>
			</p>
			{hasEstimate && (
				<span className="h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
					<span
						className="block h-full rounded-full bg-primary"
						style={{ width: `${workedShareOf(workedSeconds, estimateSeconds)}%` }}
					/>
				</span>
			)}
		</div>
	);
}

function PeopleNames({ people }: Readonly<{ people: Person[] }>) {
	const shown = people.slice(0, NAMES_IN_CARD);
	const remaining = people.length - shown.length;
	const hasRemaining = remaining > 0;
	return (
		<ul className="flex flex-col gap-1.5" data-testid="timeline-card-people">
			{shown.map((person) => (
				<li key={person.id} className="flex min-w-0 items-center gap-2 text-xs text-foreground">
					<PersonAvatar person={person} className="size-5 text-[8px] ring-0" />
					<span className="truncate">{person.name}</span>
				</li>
			))}
			{hasRemaining && <li className="pl-7 text-xs tabular-nums text-muted-foreground">+{remaining}</li>}
		</ul>
	);
}

interface TimelineTaskCardProps {
	task: TTask;
	status: TTaskStatus | undefined;
	/** The task's dates as the bar's label says them, with what is particular about them. */
	dates: string;
	isOverdue: boolean;
	/** Whether the task's dates move from its bar (a task of the active team): the card says how. */
	canEdit: boolean;
}

/**
 * What a bar's hover card says about its task: its status and priority, its dates, the people on it and the time
 * worked against the estimate. Only what the task drawer shows too: nothing is reachable from the card alone.
 */
export function TimelineTaskCard({ task, status, dates, isOverdue, canEdit }: Readonly<TimelineTaskCardProps>) {
	const t = useTranslations();
	const people = peopleOfTask(task);
	const hasPeople = people.length > 0;
	const priority = task.priority as string | null | undefined;
	const estimateSeconds = task.estimate ?? 0;
	return (
		<div className="flex flex-col gap-3" data-testid={`timeline-card-${task.id}`}>
			<div className="flex items-start gap-2 [&_[data-slot=task-property-icon]]:mt-px [&_[data-slot=task-property-icon]]:size-3.5">
				<StatusGlyph status={status} />
				<p className="line-clamp-2 min-w-0 text-[13px] leading-snug font-medium text-foreground">
					{task.title}
				</p>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				{status && (
					<span className={CARD_CHIP}>
						<StatusGlyph status={status} />
						<span className="truncate">{readableName(status.name)}</span>
					</span>
				)}
				{priority && (
					<span className={CARD_CHIP}>
						<TaskPropertyIcon kind="priority" name={priority} />
						<span className="truncate">{readableName(priority)}</span>
					</span>
				)}
			</div>
			<p
				className={cn(
					'flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0',
					isOverdue && 'text-destructive-ink'
				)}
			>
				<Calendar aria-hidden="true" />
				<span>{dates}</span>
			</p>
			<TimeWorked taskId={task.id} estimateSeconds={estimateSeconds} />
			{hasPeople && <PeopleNames people={people} />}
			{canEdit && (
				<p className="hairline-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">
					{t('pages.teamTasks.TIMELINE_DRAG_HINT')}
				</p>
			)}
		</div>
	);
}
