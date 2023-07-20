// import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Card, Modal, SpinnerLoader, Text } from 'lib/components';

// import Image from 'next/image';
import { PlusIcon } from '@heroicons/react/20/solid';
// import bugIcon from '../../../public/assets/svg/bug.svg';
// import ideaIcon from '../../../public/assets/svg/idea.svg';
import { TaskInput, TaskIssueStatus, TaskStatusDropdown } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { IHookModal, useLinkedTasks, useModal, useTeamTasks } from '@app/hooks';
import { ITeamTask } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { useCallback, useState } from 'react';

const IssueCard = ({ related }: { related: boolean }) => {
	const modal = useModal();

	const task = useRecoilValue(detailedTaskState);
	const { tasks } = useLinkedTasks(task);

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

					<ChevronUpIcon className="h-5 w-5 text-[#292D32] dark:text-white cursor-pointer" />
				</div>
			</div>
			<hr />

			<div className="flex flex-col">
				{tasks.map((task) => {
					return <RelatedTask key={task.id} task={task} />;
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
	const { tasks } = useTeamTasks();
	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback((task: ITeamTask | undefined) => {
		setLoading(true);
		console.log(task);
	}, []);

	const linkedTasks = task.linkedIssues?.map((t) => t.id) || [];
	const unlinkedTasks = tasks.filter((t) => !linkedTasks.includes(t.id));

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

function RelatedTask({ task }: { task: ITeamTask }) {
	return (
		<Card shadow="custom" className="flex justify-between">
			<div className="ml-2">
				<TaskIssueStatus
					showIssueLabels={false}
					className="px-1 py-1 rounded-full"
					task={task}
				/>
			</div>
			<div>{task.taskNumber}</div>
			<div>{task.title}</div>

			<TaskStatusDropdown defaultValue={task.status} />
		</Card>
	);
}

export default IssueCard;
