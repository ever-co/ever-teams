'use client';

import { useModal, useSyncRef, useTaskLabels, useTeamTasks } from '@/core/hooks';
import { Button, Modal } from '@/core/components';
import { TaskLabelsDropdown } from '@/core/components/tasks/task-status';
import { debounce, isEqual } from 'lodash';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AddIcon } from 'assets/svg';
import { TaskLabelForm } from './task-labels-form';
import { EverCard } from '../common/ever-card';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { taskUpdateQueue } from '@/core/utils/task.utils';

type Props = {
	task: Nullable<TTask>;
	className?: string;
	forDetails: boolean;
	taskStatusClassName?: string;
	onValueChange?: (_: any, values: string[] | undefined) => void;
};
export function TaskLabels({ task, className, forDetails, taskStatusClassName, onValueChange }: Props) {
	const $task = useSyncRef(task);
	const { updateTask, updateLoading } = useTeamTasks();
	const { taskLabels } = useTaskLabels();
	const modal = useModal();
	const latestLabels = useRef<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const onValuesChange = useCallback(
		(_: any, values: string[] | undefined) => {
			if (!$task.current) return;

			if (!isEqual(latestLabels.current, values)) {
				return;
			}

			setIsLoading(true);
			taskUpdateQueue.task(
				(task, taskLabels, values) => {
					return updateTask({
						// eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
						...task.current!,
						tags: taskLabels.filter((tag) => (tag.name ? values?.includes(tag.name) : false)) as any
					}).finally(() => {
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

	const tags = (task?.tags as typeof taskLabels | undefined)?.map((tag) => tag.name || '');

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
