import { Card, Modal, SpinnerLoader, Text } from 'lib/components';
import { TaskInput } from 'lib/features';
import { IHookModal, useTeamTasks } from '@app/hooks';
import { ITeamTask } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { useCallback, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';

function CreateParentTask({
	modal,
	task,
}: {
	modal: IHookModal;
	task: ITeamTask;
}) {
	const { trans } = useTranslation();
	const { tasks, loadTeamTasksData, updateTask } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (parentTask: ITeamTask | undefined) => {
			if (!parentTask) return;
			const childTask = cloneDeep(task);
			setLoading(true);

			await updateTask({
				...childTask,
				parentId: parentTask.id,
				parent: parentTask,
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
					<div className="absolute inset-0 bg-black/30 z-10 flex justify-center items-center">
						<SpinnerLoader />
					</div>
				)}
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center w-full">
						<Text.Heading as="h3" className="text-center mb-2">
							{trans.common.ADD_PARENT}
						</Text.Heading>
					</div>

					{/* Task  */}
					<TaskInput
						viewType="one-view"
						fullWidthCombobox={true}
						task={null}
						autoAssignTaskAuth={false}
						showTaskNumber={true}
						createOnEnterClick={false}
						tasks={filteredTasks}
						onTaskClick={onTaskSelect}
						onTaskCreated={onTaskSelect}
						cardWithoutShadow={true}
					/>
				</Card>
			</div>
		</Modal>
	);
}

export default CreateParentTask;
