'use client';

import { useModal, useSyncRef, useTeamTasks } from '@/core/hooks';
import { Button, Modal } from '@/core/components';
import { TaskLabelsDropdown } from '@/core/components/tasks/task-status';
import { debounce, isEqual } from 'lodash';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AddIcon } from 'assets/svg';
import { TaskLabelForm } from './task-labels-form';
import { EverCard } from '../common/ever-card';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { taskUpdateQueue } from '@/core/utils/task.utils';
import { taskLabelsListState } from '@/core/stores';
import { useAtomValue } from 'jotai';

type Props = {
	task: Nullable<TTask>;
	className?: string;
	forDetails: boolean;
	taskStatusClassName?: string;
	onValueChange?: (_: any, values: string[] | undefined) => void;
};
export function TaskLabels({ task, className, forDetails, taskStatusClassName, onValueChange }: Props) {
	const $task = useSyncRef(task);
	const { updateTask } = useTeamTasks();
	const taskLabels = useAtomValue(taskLabelsListState);
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
						.then(() => {
							// Success - keep optimistic value and show success toast
							toast.success('Task labels updated successfully');
						})
						.catch((error) => {
							// Error - revert optimistic value and show error toast
							setOptimisticLabels(null);
							toast.error('Failed to update task labels', {
								description: error?.message || 'Please try again'
							});
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
		[$task, taskLabels, updateTask, latestLabels]
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
				placeholder="Labels"
				defaultValues={tags || []}
				multiple={true}
				forDetails={forDetails}
				sidebarUI={forDetails}
				taskStatusClassName={taskStatusClassName}
				latestLabels={latestLabels}
				isLoading={isLoading}
			>
				<Button
					className="px-2 py-1 mt-4 w-full text-xs dark:text-white dark:border-white"
					variant="outline"
					onClick={modal.openModal}
				>
					<AddIcon className="w-6 h-6 text-dark dark:text-white" />
				</Button>
			</TaskLabelsDropdown>

			{/* Modal */}
			<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
				<EverCard className="sm:w-[530px] w-[330px]" shadow="custom">
					<TaskLabelForm onCreated={modal.closeModal} formOnly={true} />
				</EverCard>
			</Modal>
		</>
	);
}
