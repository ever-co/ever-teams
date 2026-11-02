'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Globe, Plus, Users } from '@/core/components/icons';
import { Modal } from '@/core/components';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';
import { ActiveTaskIssuesDropdown } from '@/core/components/tasks/task-issue';
import { TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { TaskPropertyMenuAction } from '@/core/components/tasks/task-property-menu';
import {
	ActiveTaskPropertiesDropdown,
	ActiveTaskSizesDropdown,
	ActiveTaskStatusDropdown,
	ActiveTaskVersionDropdown
} from '@/core/components/tasks/task-status';
import { TaskPrioritiesForm } from '@/core/components/tasks/task-priorities-form';
import { TaskSizesForm } from '@/core/components/tasks/task-sizes-form';
import { TaskStatusesForm } from '@/core/components/tasks/task-statuses-form';
import { TaskVersionForm } from '@/core/components/tasks/version-form';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { cn } from '@/core/lib/helpers';
import { canHaveParent } from '@/core/lib/utils/task-detail';
import type { TTaskVersion } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskAssigneesField } from './task-assignees-field';
import { TaskDateField } from './task-date-field';
import { allowsLegacyDialogs, useTaskDetailHost } from './task-detail-host';
import { TaskLabelsField } from './task-labels-field';
import { TaskParentField, TaskReferenceChip, epicAboveParentOf } from './task-parent-field';
import { TaskPropertyRow } from './task-property-row';
import { TaskVisibilityField } from './task-visibility-field';

const PICKER = 'h-7 w-fit max-w-full';

type CreatedProperty = 'status' | 'priority' | 'size' | 'version';

function CreateAction({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
	return (
		<TaskPropertyMenuAction icon={<Plus />} onClick={onClick}>
			{label}
		</TaskPropertyMenuAction>
	);
}

function CreatePropertyDialog({
	task,
	target,
	onClose
}: Readonly<{ task: TTask; target: CreatedProperty; onClose: () => void }>) {
	const { handleStatusUpdate } = useUpdateTask();
	const applyVersion = (version: TTaskVersion) => {
		handleStatusUpdate(version.value || version.name, 'version', task.taskStatusId, task);
	};
	return (
		<Modal isOpen={true} closeModal={onClose}>
			<div className="w-[330px] sm:w-[530px]">
				{target === 'version' && (
					<TaskVersionForm onVersionCreated={applyVersion} onCreated={onClose} formOnly={true} />
				)}
				{target === 'status' && <TaskStatusesForm onCreated={onClose} formOnly={true} />}
				{target === 'priority' && <TaskPrioritiesForm onCreated={onClose} formOnly={true} />}
				{target === 'size' && <TaskSizesForm onCreated={onClose} formOnly={true} />}
			</div>
		</Modal>
	);
}

interface TaskDetailPropertiesProps {
	task: TTask;
	/** `auto` turns to two columns once the container is wide enough; the rail keeps one. */
	columns?: 'auto' | 'one';
}

/** The estimate is not a row here: it lives with the time worked. */
export function TaskDetailProperties({ task, columns = 'auto' }: TaskDetailPropertiesProps) {
	const t = useTranslations();
	const host = useTaskDetailHost();
	const canCreate = allowsLegacyDialogs(host);
	const [creating, setCreating] = useState<CreatedProperty | null>(null);
	const showsParent = canHaveParent(task);
	const epic = epicAboveParentOf(task);
	const isTwoColumns = columns === 'auto';

	return (
		<div className={cn(isTwoColumns && '@container')}>
			<div className={cn('grid gap-x-6', isTwoColumns && '@2xl:grid-cols-2')}>
				<TaskPropertyRow icon={<TaskPropertyPlaceholderIcon kind="status" />} label={t('common.STATUS')}>
					<ActiveTaskStatusDropdown task={task} className={PICKER}>
						{canCreate && (
							<CreateAction
								label={t('taskMenus.actions.createStatus')}
								onClick={() => setCreating('status')}
							/>
						)}
					</ActiveTaskStatusDropdown>
				</TaskPropertyRow>
				<TaskPropertyRow
					icon={<TaskPropertyPlaceholderIcon kind="priority" />}
					label={t('pages.taskDetails.PRIORITY')}
				>
					<ActiveTaskPropertiesDropdown task={task} className={PICKER}>
						{canCreate && (
							<CreateAction
								label={t('taskMenus.actions.createPriority')}
								onClick={() => setCreating('priority')}
							/>
						)}
					</ActiveTaskPropertiesDropdown>
				</TaskPropertyRow>
				<TaskPropertyRow icon={<TaskPropertyPlaceholderIcon kind="size" />} label={t('pages.taskDetails.SIZE')}>
					<ActiveTaskSizesDropdown task={task} className={PICKER}>
						{canCreate && (
							<CreateAction
								label={t('taskMenus.actions.createSize')}
								onClick={() => setCreating('size')}
							/>
						)}
					</ActiveTaskSizesDropdown>
				</TaskPropertyRow>
				<TaskPropertyRow icon={<TaskPropertyPlaceholderIcon kind="issueType" />} label={t('common.ISSUE_TYPE')}>
					<ActiveTaskIssuesDropdown
						task={task}
						showIssueLabels={true}
						forParentChildRelationship={true}
						className={PICKER}
					/>
				</TaskPropertyRow>
				<TaskPropertyRow icon={<Users />} label={t('pages.taskDetails.ASSIGNEES')} alignTop={true}>
					<TaskAssigneesField task={task} />
				</TaskPropertyRow>
				<TaskPropertyRow
					icon={<TaskPropertyPlaceholderIcon kind="label" />}
					label={t('common.LABELS')}
					alignTop={true}
				>
					<TaskLabelsField task={task} />
				</TaskPropertyRow>
				<TaskPropertyRow
					icon={<TaskPropertyPlaceholderIcon kind="project" />}
					label={t('pages.taskDetails.PROJECT')}
				>
					<ProjectDropDown task={task} styles={{ container: 'min-w-0 max-w-56' }} />
				</TaskPropertyRow>
				<TaskPropertyRow
					icon={<TaskPropertyPlaceholderIcon kind="version" />}
					label={t('pages.taskDetails.VERSION')}
				>
					<ActiveTaskVersionDropdown task={task} className={PICKER}>
						{canCreate && (
							<CreateAction
								label={t('taskMenus.actions.createVersion')}
								onClick={() => setCreating('version')}
							/>
						)}
					</ActiveTaskVersionDropdown>
				</TaskPropertyRow>
				{showsParent && (
					<TaskPropertyRow
						icon={<TaskPropertyPlaceholderIcon kind="epic" />}
						label={t('taskDetail.properties.PARENT')}
					>
						<TaskParentField task={task} />
					</TaskPropertyRow>
				)}
				{epic && (
					<TaskPropertyRow
						icon={<TaskPropertyPlaceholderIcon kind="epic" />}
						label={t('pages.taskDetails.EPIC')}
					>
						<TaskReferenceChip task={epic} />
					</TaskPropertyRow>
				)}
				<TaskPropertyRow icon={<Calendar />} label={t('pages.taskDetails.START_DATE')}>
					<TaskDateField task={task} kind="start" />
				</TaskPropertyRow>
				<TaskPropertyRow icon={<Calendar />} label={t('pages.taskDetails.DUE_DATE')}>
					<TaskDateField task={task} kind="due" />
				</TaskPropertyRow>
				<TaskPropertyRow icon={<Globe />} label={t('taskDetail.properties.VISIBILITY')}>
					<TaskVisibilityField task={task} />
				</TaskPropertyRow>
			</div>
			{creating && <CreatePropertyDialog task={task} target={creating} onClose={() => setCreating(null)} />}
		</div>
	);
}
