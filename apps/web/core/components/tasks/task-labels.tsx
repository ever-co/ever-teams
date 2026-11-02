'use client';

import { useModal, useSyncRef, useUpdateTask } from '@/core/hooks';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { Modal } from '@/core/components';
import { TaskLabelsDropdown } from '@/core/components/tasks/task-status';
import { debounce, isEqual } from 'lodash';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { Plus } from '@/core/components/icons';
import { TaskLabelForm } from './task-labels-form';
import { TaskPropertyMenuAction } from './task-property-menu';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';

import { taskUpdateQueue } from '@/core/lib/utils/task.utils';

type Props = {
	task: Nullable<TTask>;
	className?: string;
	forDetails: boolean;
	taskStatusClassName?: string;
	onValueChange?: (_: any, values: string[] | undefined) => void;
};
export function TaskLabels({ task, className, forDetails, taskStatusClassName, onValueChange }: Props) {
	const t = useTranslations();
	const $task = useSyncRef(task);
	const { updateTask } = useUpdateTask();
	const { taskLabels } = useTaskLabelsQuery();
	const modal = useModal();
	const latestLabels = useRef<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [optimisticLabels, setOptimisticLabels] = useState<string[] | null>(null);

	// Reset optimistic labels when task changes
	useEffect(() => {
		setOptimisticLabels(null);
	}, [task?.id]);

	const onValuesChange = useCallback(
		(_: any, values: string[] | undefined) => {
			if (!$task.current) return;

			if (!isEqual(latestLabels.current, values)) {
				return;
			}

			// Set optimistic value immediately
			setOptimisticLabels(values || []);
			setIsLoading(true);

			taskUpdateQueue.task(
				(task, taskLabels, values) => {
					return updateTask({
						...task.current!,
						tags: taskLabels.filter((tag) => (tag.name ? values?.includes(tag.name) : false)) as any
					})
						.catch((error: unknown) => {
							// Error - revert optimistic value and show error toast
							setOptimisticLabels(null);
							const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
							toast.error(t('toasts.tasks.LABELS_UPDATE_FAILED'), { description: t(reasonKey) });
							console.error('Error updating task labels:', error);
						})
						.finally(() => {
							setIsLoading(false);
						});
				},
				$task,
				taskLabels,
				values
			);
		},
		[$task, taskLabels, updateTask, latestLabels, t]
	);

	const onValuesChangeDebounce = useMemo(() => debounce(onValuesChange, 2000), [onValuesChange]);

	// Use optimistic labels if available, otherwise use actual task labels
	const actualTags = (task?.tags as typeof taskLabels | undefined)?.map((tag) => tag.name || '');
	const tags = optimisticLabels !== null ? optimisticLabels : actualTags;

	return (
		<>
			<TaskLabelsDropdown
				onValueChange={onValueChange ? onValueChange : onValuesChangeDebounce}
				className={className}
				defaultValues={tags || []}
				multiple={true}
				forDetails={forDetails}
				sidebarUI={forDetails}
				taskStatusClassName={taskStatusClassName}
				latestLabels={latestLabels}
				isLoading={isLoading}
			>
				<TaskPropertyMenuAction icon={<Plus />} onClick={modal.openModal}>
					{t('taskMenus.actions.createLabel')}
				</TaskPropertyMenuAction>
			</TaskLabelsDropdown>

			{/* Modal */}
			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<div className="w-[330px] sm:w-[530px]">
					<TaskLabelForm onCreated={modal.closeModal} formOnly={true} />
				</div>
			</Modal>
		</>
	);
}
