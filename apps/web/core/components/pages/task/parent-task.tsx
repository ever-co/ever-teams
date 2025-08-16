import { IHookModal, useTeamTasks } from '@/core/hooks';
import { Modal, SpinnerLoader, Text } from '@/core/components';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EverCard } from '../../common/ever-card';
import { TaskInput } from '../../tasks/task-input';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { tasksByTeamState } from '@/core/stores';
function CreateParentTask({ modal, task }: { modal: IHookModal; task: TTask }) {
	const t = useTranslations();

	const tasks = useAtomValue(tasksByTeamState);
	const { loadTeamTasksData, updateTask } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (parentTask: TTask | undefined) => {
			if (!parentTask) return;

			const childTask = cloneDeep(task);
			setLoading(true);

			try {
				// Update the task with parent assignment
				await updateTask({
					...task,
					parentId: parentTask.id,
					parent: { ...parentTask, id: parentTask.id },
					id: task.id
				});
				// Show success notification with task titles
				toast.success(
					t('common.PARENT_TASK_ASSIGNED_SUCCESS', {
						parentTitle: parentTask.title,
						childTitle: childTask.title
					})
				);

				// Reload team tasks data to ensure UI synchronization
				await loadTeamTasksData(false);

				// Close modal on success
				modal.closeModal();
			} catch (error) {
				// Show error notification with task titles
				toast.error(
					t('common.PARENT_TASK_ASSIGNMENT_FAILED', {
						parentTitle: parentTask.title,
						childTitle: childTask.title
					}),
					{
						description: t('common.PARENT_TASK_ASSIGNMENT_ERROR', {
							parentTitle: parentTask.title,
							childTitle: childTask.title
						})
					}
				);

				console.error('Error assigning parent task:', error);
			} finally {
				setLoading(false);
			}
		},
		[task, loadTeamTasksData, modal, updateTask, t]
	);

	const filteredTasks = tasks.filter((t) => t.id !== task.id);

	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
			<div className="w-[98%] md:w-[668px] relative">
				{loading && (
					<div className="flex absolute inset-0 z-10 justify-center items-center bg-black/30">
						<SpinnerLoader />
					</div>
				)}
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center w-full">
						<Text.Heading as="h3" className="mb-2 text-center">
							{t('common.ADD_PARENT')}
						</Text.Heading>
					</div>

					{/* Task  */}
					<TaskInput
						viewType="one-view"
						fullWidthCombobox={true}
						task={task}
						autoAssignTaskAuth={false}
						showTaskNumber={true}
						createOnEnterClick={false}
						tasks={filteredTasks}
						onTaskClick={onTaskSelect}
						onTaskCreated={onTaskSelect}
						cardWithoutShadow={true}
						forParentChildRelationship={true}
					/>
				</EverCard>
			</div>
		</Modal>
	);
}

export default CreateParentTask;
