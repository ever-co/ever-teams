import { Card, Modal, SpinnerLoader, Text } from 'lib/components';
import { TaskInput, TaskLinkedIssue } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { IHookModal, useModal, useQuery, useTeamTasks } from '@app/hooks';
import { ITeamTask, TaskRelatedIssuesRelationEnum } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { useCallback, useMemo, useState } from 'react';
import { createTaskLinkedIsssueAPI } from '@app/services/client/api';
import { clsxm } from '@app/utils';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from 'lib/components/svgs';

export const RelatedIssueCard = () => {
	const { trans } = useTranslation();
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

	const ActionsTypes = {
		[TaskRelatedIssuesRelationEnum.BLOCKS]: trans.common.BLOCKS,
		[TaskRelatedIssuesRelationEnum.CLONES]: trans.common.CLONES,
		[TaskRelatedIssuesRelationEnum.DUPLICATES]: trans.common.DUPLICATES,
		[TaskRelatedIssuesRelationEnum.IS_BLOCKED_BY]: trans.common.IS_BLOCKED_BY,
		[TaskRelatedIssuesRelationEnum.IS_CLONED_BY]: trans.common.IS_CLONED_BY,
		[TaskRelatedIssuesRelationEnum.IS_DUPLICATED_BY]:
			trans.common.IS_DUPLICATED_BY,
		[TaskRelatedIssuesRelationEnum.RELATES_TO]: trans.common.RELATES_TO,
	};

	return (
		<Card
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-[1.125rem] border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<p className="text-base font-semibold">{trans.common.RELATED_ISSUES}</p>

				{/* {related ? (

				) : (
					<p className="text-base font-semibold">{trans.common.CHILD_ISSUES}</p>
				)} */}

				<div className="flex items-center justify-end gap-2.5">
					<div className="border-r border-r-[#0000001A] flex items-center gap-2.5">
						<span onClick={modal.openModal}>
							<PlusIcon className="h-7 w-7 stroke-[#B1AEBC] dark:stroke-white cursor-pointer" />
						</span>
					</div>

					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>

			{/* {linkedTasks.length > 0 && <hr className="dark:border-[#7B8089]" />} */}

			{linkedTasks.length > 0 && (
				<div
					className={clsxm(
						'flex flex-col max-h-80 gap-3',
						hidden && ['hidden']
					)}
				>
					{linkedTasks.map((task) => {
						return (
							<TaskLinkedIssue
								key={task.id}
								task={task}
								className="dark:bg-[#25272D] py-0"
							/>
						);
					})}
				</div>
			)}

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
						cardWithoutShadow={true}
					/>
				</Card>
			</div>
		</Modal>
	);
}
