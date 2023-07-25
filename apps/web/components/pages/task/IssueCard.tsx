// import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { Card, Modal, SpinnerLoader, Text } from 'lib/components';

// import Image from 'next/image';
import { PlusIcon } from '@heroicons/react/20/solid';
// import bugIcon from '../../../public/assets/svg/bug.svg';
// import ideaIcon from '../../../public/assets/svg/idea.svg';
import { TaskInput, TaskLinkedIssue } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { IHookModal, useModal, useQuery, useTeamTasks } from '@app/hooks';
import { ITeamTask, TaskRelatedIssuesRelationEnum } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { useCallback, useMemo, useState } from 'react';
import { createTaskLinkedIsssueAPI } from '@app/services/client/api';
import { clsxm } from '@app/utils';

const IssueCard = ({ related }: { related: boolean }) => {
	const modal = useModal();
	const task = useRecoilValue(detailedTaskState);
	const { tasks } = useTeamTasks();
	const [hidden, setHidden] = useState(false);

	const linkedTasks = useMemo(() => {
		return (
			task?.linkedIssues
				?.map<ITeamTask>((t) => {
					return tasks.find((ts) => ts.id === t.taskFrom.id) || t.taskFrom;
				})
				.filter(Boolean) || []
		);
	}, [task, tasks]);

	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex justify-between">
				{related ? (
					<h4 className="text-lg font-semibold pb-2">Related Issues</h4>
				) : (
					<h4 className="text-lg font-semibold pb-2">Child Issues</h4>
				)}

				<div className="flex items-center">
					{/* <ToolButton iconSource="/assets/svg/add.svg" />
					<ToolButton iconSource="/assets/svg/more.svg" /> */}

					<PlusIcon
						onClick={modal.openModal}
						className="h-5 w-5 text-[#292D32] dark:text-white cursor-pointer"
					/>

					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-5 w-5 text-[#292D32] dark:text-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-5 w-5 text-[#292D32] dark:text-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>
			<hr />

			<div className={clsxm('flex flex-col', hidden && ['hidden'])}>
				{linkedTasks.map((task) => {
					return <TaskLinkedIssue key={task.id} task={task} />;
				})}
			</div>

			{task && <CreateLinkedTask task={task} modal={modal} />}
		</Card>
	);
};

function CreateLinkedTask({
	modal,
	task,
}: {
	modal: IHookModal;
	task: ITeamTask;
}) {
	const { trans } = useTranslation();
	const { tasks, loadTeamTasksData } = useTeamTasks();
	const { queryCall } = useQuery(createTaskLinkedIsssueAPI);
	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (childTask: ITeamTask | undefined) => {
			if (!childTask) return;
			setLoading(true);
			const parentTask = task;

			await queryCall({
				taskFromId: childTask?.id,
				taskToId: parentTask.id,

				organizationId: task.organizationId,
				action: TaskRelatedIssuesRelationEnum.RELATES_TO,
			}).catch(console.error);

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, queryCall, loadTeamTasksData, modal]
	);

	const linkedTasks = task.linkedIssues?.map((t) => t.taskFrom.id) || [];
	const unlinkedTasks = tasks
		.filter((t) => !linkedTasks.includes(t.id))
		.filter((t) => t.id != task.id);

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
							{trans.common.LINK_TASK}
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
						tasks={unlinkedTasks}
						onTaskClick={onTaskSelect}
						onTaskCreated={onTaskSelect}
					/>
				</Card>
			</div>
		</Modal>
	);
}

export default IssueCard;
