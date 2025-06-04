import { IHookModal, useTeamTasks } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/task';
import { Modal, SpinnerLoader, Text } from '@/core/components';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EverCard } from '../../common/ever-card';
import { TaskInput } from '../../tasks/task-input';

function CreateParentTask({ modal, task }: { modal: IHookModal; task: ITask }) {
	const t = useTranslations();
	const { tasks, loadTeamTasksData, updateTask } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (parentTask: ITask | undefined) => {
			if (!parentTask) return;
			const childTask = cloneDeep(task);
			setLoading(true);

			await updateTask({
				...childTask,
				parentId: parentTask.id,
				parent: parentTask
			});

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, loadTeamTasksData, modal, updateTask]
	);

	const filteredTasks = tasks.filter((t) => t.id != task.id);

	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
			<div className="w-[98%] md:w-[668px] relative">
				{loading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
						<SpinnerLoader />
					</div>
				)}
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between w-full">
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
