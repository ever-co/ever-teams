'use client';

import { useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Plus, X } from '@/core/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useLiveTaskId } from '@/core/hooks/tasks/use-live-task-id';
import { useTaskHierarchy } from '@/core/hooks/tasks/use-task-hierarchy';
import { cn } from '@/core/lib/helpers';
import { childCandidatesOf, childProgressOf } from '@/core/lib/utils/task-detail';
import { tasksByTeamState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	DETAIL_ADD_ROW,
	DETAIL_GHOST_ACTION,
	DETAIL_ICON_ACTION,
	DETAIL_LIST_SURFACE,
	DETAIL_ROW_ACTION
} from './task-detail-recipes';
import { TaskDetailSection } from './task-detail-section';
import { ProgressRing, TaskIssueRow, useStatusColors } from './task-issue-row';
import { TaskPickerMenu } from './task-picker-menu';

function RemoveChildButton({ child, onRemove }: Readonly<{ child: TTask; onRemove: (child: TTask) => void }>) {
	const t = useTranslations();
	const label = t('taskDetail.subtasks.REMOVE');
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						onClick={() => onRemove(child)}
						className={cn(DETAIL_ICON_ACTION, DETAIL_ROW_ACTION, 'size-6')}
					>
						<X aria-hidden="true" className="size-3.5" />
					</button>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function TaskDetailSubtasks({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const teamTasks = useAtomValue(tasksByTeamState);
	const { data: user } = useUserQuery();
	const liveTaskId = useLiveTaskId();
	const statusColors = useStatusColors();
	const { addChild, removeChild, createChild, isSaving } = useTaskHierarchy(task);
	const candidates = useMemo(() => childCandidatesOf(task, teamTasks), [task, teamTasks]);
	const children = task.children ?? [];
	const progress = childProgressOf(children);
	const hasChildren = progress.total > 0;
	const canCreate = Boolean(user?.isEmailVerified);
	const addLabel = t('taskDrawer.ADD_CHILD_ISSUE');
	let onCreate: ((title: string) => void) | undefined;
	if (canCreate) {
		onCreate = (title) => void createChild(title);
	}

	const picker = (trigger: ReactNode, triggerClassName: string) => (
		<TaskPickerMenu
			tasks={candidates}
			onPick={(child) => void addChild(child)}
			searchPlaceholder={t('taskDetail.subtasks.SEARCH')}
			triggerLabel={addLabel}
			triggerClassName={triggerClassName}
			onCreate={onCreate}
			createLabel={(title) => t('taskDetail.picker.CREATE_CHILD', { title })}
			align="end"
			disabled={isSaving}
		>
			{trigger}
		</TaskPickerMenu>
	);

	const headerAction =
		hasChildren &&
		picker(
			<span className={DETAIL_GHOST_ACTION}>
				<Plus aria-hidden="true" />
				{t('taskDrawer.ADD')}
			</span>,
			'rounded-md'
		);

	return (
		<TaskDetailSection
			title={t('common.CHILD_ISSUES')}
			meta={hasChildren && <ProgressRing done={progress.done} total={progress.total} />}
			actions={headerAction}
		>
			{hasChildren && (
				<ul className={DETAIL_LIST_SURFACE}>
					{children.map((child) => (
						<TaskIssueRow
							key={child.id}
							task={child}
							statusColor={statusColors.get(child.taskStatusId ?? '')}
							isLive={child.id === liveTaskId}
							trailing={
								<RemoveChildButton child={child} onRemove={(removed) => void removeChild(removed)} />
							}
						/>
					))}
				</ul>
			)}
			{!hasChildren &&
				picker(
					<span className={DETAIL_ADD_ROW}>
						<Plus aria-hidden="true" />
						{addLabel}
					</span>,
					'block w-full rounded-xl'
				)}
		</TaskDetailSection>
	);
}
