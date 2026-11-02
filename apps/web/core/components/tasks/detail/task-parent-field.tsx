'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ParentTask, Plus, Trash } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskPropertyMenuAction } from '@/core/components/tasks/task-property-menu';
import { useTaskHierarchy } from '@/core/hooks/tasks/use-task-hierarchy';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { parentCandidatesOf } from '@/core/lib/utils/task-detail';
import { tasksByTeamState } from '@/core/stores';
import { EIssueType } from '@/core/types/generics/enums/task';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_EMPTY_VALUE, DETAIL_ICON_ACTION, DETAIL_TASK_CHIP } from './task-detail-recipes';
import { useOpenTask } from './task-issue-row';
import { TaskPickerMenu, taskNumberOf } from './task-picker-menu';

function parentTypeFor(task: TTask) {
	if (task.issueType === EIssueType.STORY) {
		return EIssueType.EPIC;
	}
	return EIssueType.STORY;
}

export function TaskReferenceChip({ task, className }: Readonly<{ task: TTask; className?: string }>) {
	const number = taskNumberOf(task);
	const openTask = useOpenTask(task.id);
	return (
		<Link href={`/task/${task.id}`} onClick={openTask} title={task.title} className={className ?? DETAIL_TASK_CHIP}>
			<TaskPropertyIcon kind="issueType" name={task.issueType ?? undefined} className="size-4" />
			{number && <span className="shrink-0 tabular-nums text-muted-foreground">#{number}</span>}
			<span className="min-w-0 truncate">{task.title}</span>
		</Link>
	);
}

export function TaskParentField({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const teamTasks = useAtomValue(tasksByTeamState);
	const { data: user } = useUserQuery();
	const { setParent, removeParent, createParent, isSaving } = useTaskHierarchy(task);
	const candidates = useMemo(() => parentCandidatesOf(task, teamTasks), [task, teamTasks]);
	let parent: TTask | null = null;
	if (task.parentId && task.parent) {
		parent = task.parent;
	}
	const hasParent = Boolean(parent);
	const newParentType = parentTypeFor(task);
	const canCreate = Boolean(user?.isEmailVerified);
	let onCreate: ((title: string) => void) | undefined;
	if (canCreate) {
		onCreate = (title) => void createParent(title, newParentType);
	}

	const removeAction = hasParent && (
		<TaskPropertyMenuAction icon={<Trash />} onClick={() => void removeParent()}>
			{t('taskDetail.properties.REMOVE_PARENT')}
		</TaskPropertyMenuAction>
	);

	return (
		<span className="flex min-w-0 max-w-full items-center gap-1">
			{parent && <TaskReferenceChip task={parent} />}
			<TaskPickerMenu
				tasks={candidates}
				onPick={(picked) => void setParent(picked)}
				isSelected={(candidate) => candidate.id === task.parentId}
				searchPlaceholder={t('taskDetail.properties.SEARCH_PARENT')}
				triggerLabel={t('taskDetail.properties.CHANGE_PARENT')}
				triggerClassName="rounded-md"
				onCreate={onCreate}
				createLabel={(title) => t('taskDetail.picker.CREATE_PARENT', { title })}
				footerActions={removeAction}
				disabled={isSaving}
			>
				{hasParent && (
					<span className={DETAIL_ICON_ACTION}>
						<ParentTask aria-hidden="true" />
					</span>
				)}
				{!hasParent && (
					<span className={DETAIL_EMPTY_VALUE}>
						<Plus aria-hidden="true" />
						{t('taskDetail.properties.ADD_PARENT')}
					</span>
				)}
			</TaskPickerMenu>
		</span>
	);
}

export function epicAboveParentOf(task: TTask) {
	const rootEpic = task.rootEpic ?? null;
	if (!rootEpic) {
		return null;
	}
	const isParent = rootEpic.id === task.parentId;
	if (isParent) {
		return null;
	}
	const isTaskItself = rootEpic.id === task.id;
	if (isTaskItself) {
		return null;
	}
	return rootEpic;
}
