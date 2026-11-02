import { useAtom, useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { TaskDrawerLink } from './drawer/task-drawer-link';
import React from 'react';

import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { Priority } from '@/core/components/tasks/kanban-card';
import { useTaskStatistics } from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { cn } from '@/core/lib/helpers';
import { getTaskTotalWorkedDuration } from '@/core/lib/utils/task.utils';
import { activeTeamState, activeTeamTaskId, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { TTask } from '@/core/types/schemas/task/task.schema';

import { LazyMenuKanbanCard, LazyTaskAllStatusTypes } from '../optimized-components';
import { TaskInput } from './task-input';
import { TaskIssueStatus } from './task-issue';

interface TaskItemProps {
	task: TTask;
}

const AVATAR_DIAMETER = 24;

const NO_ESTIMATE_TEXT = '–';

/** Every card keeps the progress line, so cards of one lane share their height; without an estimate it stays empty. */
function estimateProgressOf(hasEstimate: boolean, roundedProgress: number) {
	if (!hasEstimate) {
		return { meterShare: 0, progressText: NO_ESTIMATE_TEXT };
	}
	return { meterShare: roundedProgress, progressText: `${roundedProgress}%` };
}

function assigneeImagesOf(task: TTask): ImageOverlapperProps[] {
	const members = task.members ?? [];
	return members.map((member) => ({
		id: member.user?.id ?? '',
		url: member.user?.imageUrl ?? '',
		alt: member.user?.firstName ?? ''
	}));
}

/**
 * A task of a plan in the Blocks view: the title first, the property chips under it, then how much of the estimate
 * the time worked on it uses, who is on it and that time. The time is the task's own total, the figure the progress
 * is made of, so the two always agree.
 */
export default function TaskBlockCard(props: TaskItemProps) {
	const { task } = props;
	const t = useTranslations();
	const [activeTask, setActiveTask] = useAtom(activeTeamTaskId);
	const activeTeam = useAtomValue(activeTeamState);
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const { data: user } = useUserQuery();
	const { getEstimation } = useTaskStatistics(0);
	const members = activeTeam?.members || [];
	const currentMember = members.find((member) => member.employee?.userId === user?.id);

	const totalWorkedTasksTimer = getTaskTotalWorkedDuration(activeTeam?.members, task.id);
	const progress = getEstimation(null, task, totalWorkedTasksTimer || 1, task.estimate || 0);
	const roundedProgress = Math.round(progress);
	const estimateSeconds = task.estimate || 0;
	const hasEstimate = estimateSeconds > 0;
	const { meterShare, progressText } = estimateProgressOf(hasEstimate, roundedProgress);

	const taskAssignee = assigneeImagesOf(task);
	const workedText = formatDurationShort(totalWorkedTasksTimer);
	const isActiveTask = activeTeamTask?.id === task.id;
	const isLive = isActiveTask && Boolean(timerStatus?.running);
	const isRenaming = activeTask?.id == task.id;

	let timeLabel = t('common.WORKED');
	let timeClassName = 'text-foreground';
	if (isLive) {
		timeLabel = t('common.LIVE');
		timeClassName = 'text-success-foreground';
	}

	return (
		<div className="relative my-2.5 flex w-72 max-w-full flex-col gap-3 rounded-xl bg-card p-3 text-card-foreground hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="flex min-h-10 w-full items-start justify-between gap-2">
				<div className="flex min-w-0 flex-1 items-center">
					{isRenaming && (
						<div className="w-full min-w-0">
							<TaskInput
								task={task}
								initEditMode={true}
								keepOpen={true}
								showCombobox={false}
								autoFocus={true}
								autoInputSelectText={true}
								onEnterKey={() => {
									setActiveTask({ id: '' });
								}}
							/>
						</div>
					)}
					{!isRenaming && (
						<TaskDrawerLink
							taskId={task.id}
							className="min-w-0 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<span className="line-clamp-2 text-[13px] font-medium leading-5 text-foreground">
								{task.issueType && (
									<TaskIssueStatus
										showIssueLabels={false}
										type="HORIZONTAL"
										task={task}
										className="mr-1.5 inline-flex size-4 items-center justify-center rounded-[4px] !p-0 align-[-3px]"
									/>
								)}
								<span className="mr-1 font-normal tabular-nums text-muted-foreground">
									#{task.number}
								</span>
								{task.title}
								{task.priority && (
									<span className="ml-1 inline-block align-middle">
										<Priority level={task.priority} />
									</span>
								)}
							</span>
						</TaskDrawerLink>
					)}
				</div>
				<span className="-mr-1 -mt-0.5 shrink-0">
					<LazyMenuKanbanCard member={currentMember} item={task} />
				</span>
			</div>

			<div className="h-6 min-w-0 overflow-hidden">
				<LazyTaskAllStatusTypes
					className="justify-start"
					task={task}
					showStatus={false}
					tab="default"
					dayPlanTab="All Tasks"
				/>
			</div>

			<div className="flex h-4 items-center gap-2">
				<ShareMeter share={meterShare} className="flex-1" />
				<span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
					{progressText}
				</span>
			</div>

			<div className="flex h-7 items-center justify-between gap-3">
				<ImageComponent avatarSize={AVATAR_DIAMETER} images={taskAssignee} item={task} />
				<span className="flex items-baseline gap-1.5 whitespace-nowrap">
					<span className="text-xs text-muted-foreground">{timeLabel}</span>
					<span className={cn('text-[13px] font-medium tabular-nums', timeClassName)}>{workedText}</span>
				</span>
			</div>
		</div>
	);
}
