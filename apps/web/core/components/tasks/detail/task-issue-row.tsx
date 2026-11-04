'use client';

import { useMemo, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { isPlainClick } from '@/core/components/tasks/drawer/task-drawer-link';
import { AvatarStack, personFromTaskMember } from '@/core/components/teams/people-avatars';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { cn } from '@/core/lib/helpers';
import { isTaskFinished } from '@/core/lib/helpers/task';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTaskDetailHost } from './task-detail-host';
import { DETAIL_ISSUE_ROW } from './task-detail-recipes';
import { TaskIssueStatusMenu } from './task-issue-status-menu';
import { taskNumberOf } from './task-picker-menu';

const RING_RADIUS = 6.5;

const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Read once for a whole list instead of once per row. */
export function useStatusColors() {
	const { taskStatuses } = useTaskStatusesQuery();
	return useMemo(() => {
		const colors = new Map<string, string | null | undefined>();
		for (const status of taskStatuses) {
			colors.set(status.id, status.color);
		}
		return colors;
	}, [taskStatuses]);
}

export function ProgressRing({ done, total }: Readonly<{ done: number; total: number }>) {
	const t = useTranslations();
	const share = done / total;
	const filledLength = RING_LENGTH * share;
	const isComplete = done === total;
	return (
		<span
			className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground"
			aria-label={t('taskDrawer.CHILD_PROGRESS', { done, total })}
		>
			<svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden="true">
				<circle cx="8" cy="8" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-foreground/10" />
				<circle
					cx="8"
					cy="8"
					r={RING_RADIUS}
					fill="none"
					strokeWidth="2"
					strokeLinecap="round"
					strokeDasharray={`${filledLength} ${RING_LENGTH}`}
					className={cn(isComplete && 'stroke-success', !isComplete && 'stroke-primary')}
				/>
			</svg>
			<span aria-hidden="true">
				{done}/{total}
			</span>
		</span>
	);
}

/** In the plan dialog a row follows its link: a drawer would open under the dialog. */
export function useOpenTask(taskId: string) {
	const host = useTaskDetailHost();
	const { showTaskInDrawer, openTaskDrawer } = useTaskDrawer();
	return (event: MouseEvent<HTMLAnchorElement>) => {
		if (!isPlainClick(event)) {
			return;
		}
		if (host === 'dialog') {
			return;
		}
		event.preventDefault();
		if (host === 'drawer') {
			showTaskInDrawer(taskId);
			return;
		}
		openTaskDrawer(taskId);
	};
}

interface TaskIssueRowProps {
	task: TTask;
	statusColor: string | null | undefined;
	isLive?: boolean;
	trailing?: ReactNode;
}

export function TaskIssueRow({ task, statusColor, isLive = false, trailing }: Readonly<TaskIssueRowProps>) {
	const t = useTranslations();
	const openIssue = useOpenTask(task.id);
	const number = taskNumberOf(task);
	const isFinished = isTaskFinished(task.status);
	const people = (task.members ?? []).map(personFromTaskMember);
	const hasPeople = people.length > 0;

	return (
		<li className={DETAIL_ISSUE_ROW}>
			<TaskIssueStatusMenu task={task} fallbackColor={statusColor} />
			<Link
				href={`/task/${task.id}`}
				onClick={openIssue}
				className="flex min-w-0 flex-1 items-center gap-2.5 self-stretch rounded-lg py-2 pl-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25"
			>
				{number && <span className="shrink-0 tabular-nums text-muted-foreground">#{number}</span>}
				<span
					className={cn(
						'min-w-0 truncate font-medium text-foreground',
						isFinished && 'text-muted-foreground line-through decoration-foreground/30'
					)}
				>
					{task.title}
				</span>
				{isLive && (
					<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success-foreground">
						<span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
						{t('common.LIVE')}
					</span>
				)}
			</Link>
			{trailing}
			{hasPeople && <AvatarStack people={people} max={2} />}
		</li>
	);
}
