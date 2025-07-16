/* eslint-disable no-mixed-spaces-and-tabs */
import { IHookModal, useModal, useQueryCall, useTeamTasks } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Modal, SpinnerLoader, Text } from '@/core/components';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AddIcon } from 'assets/svg';
import { taskLinkedIssueService } from '@/core/services/client/api/tasks/task-linked-issue.service';
import { EverCard } from '../../common/ever-card';
import { TaskLinkedIssue } from '../../tasks/task-linked-issue';
import { TaskInput } from '../../tasks/task-input';
import { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import { EIssueType, ERelatedIssuesRelation } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { FC } from 'react';

import { useSetAtom } from 'jotai';
import { detailedTaskState } from '@/core/stores';
export const RelatedIssueCard: FC<{ task: TTask }> = ({ task }) => {
	const t = useTranslations();
	const modal = useModal();

	const { tasks } = useTeamTasks();
	const [hidden, setHidden] = useState(false);

	// const { actionType, actionTypeItems, onChange } = useActionType();

	const linkedTasks = useMemo(() => {
		const issues = task?.linkedIssues?.reduce(
			(acc, item) => {
				const $item = tasks.find((ts) => ts.id === item.taskFrom?.id) || item.taskFrom;

				if ($item /*&& item.action === actionType?.data?.value*/) {
					acc.push({
						issue: item,
						task: $item
					});
				}

				return acc;
			},
			[] as { issue: ITaskLinkedIssue; task: TTask }[]
		);

		return issues || [];
	}, [task, tasks]);

	return (
		<EverCard
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-[1.125rem] border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<p className="text-base font-semibold">{t('common.RELATED_ISSUES')}</p>

				{/* <p className="text-base font-semibold">{trans.common.CHILD_ISSUES}</p>*/}

				<div className="flex items-center justify-end gap-2.5">
					<div className="border-r border-r-[#0000001A] flex items-center gap-2.5">
						<span onClick={modal.openModal}>
							<AddIcon className="h-4 w-4 text-[#B1AEBC] dark:text-white cursor-pointer mr-1.5" />
						</span>
					</div>

					{/* <Dropdown
						className="min-w-[150px] max-w-sm z-10 dark:bg-dark--theme-light"
						// buttonClassName={clsxm(
						// 	'py-0 font-medium h-[45px] w-[145px] z-10 outline-none dark:bg-dark--theme-light'
						// )}
						value={actionType}
						onChange={onChange}
						items={actionTypeItems}
						// optionsClassName={'outline-none'}
					/> */}

					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>

			{/* {linkedTasks.length > 0 && <hr className="dark:border-[#7B8089]" />} */}

			{linkedTasks.length > 0 && (
				<div className={clsxm('flex flex-col max-h-80 gap-3', hidden && ['hidden'])}>
					{linkedTasks?.map(({ task, issue }) => {
						return (
							<TaskLinkedIssue
								key={task.id}
								task={task}
								issue={issue}
								relatedTaskDropdown={true}
								className="dark:bg-[#25272D] py-0"
							/>
						);
					})}
				</div>
			)}

			{task && <CreateLinkedTask task={task} modal={modal} />}
		</EverCard>
	);
};

function CreateLinkedTask({ modal, task }: { modal: IHookModal; task: TTask }) {
	const t = useTranslations();

	const { tasks, loadTeamTasksData, detailedTask, getTaskById } = useTeamTasks();
	const setDetailedTask = useSetAtom(detailedTaskState);
	const { queryCall } = useQueryCall(taskLinkedIssueService.createTaskLinkedIssue);
	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (childTask: TTask | undefined) => {
			if (!childTask) return;
			setLoading(true);
			const parentTask = task;

			await queryCall({
				taskFromId: childTask?.id,
				taskToId: parentTask.id,

				organizationId: task.organizationId,
				action: ERelatedIssuesRelation.RELATES_TO
			})
				.then((res) => {
					if (task.id === detailedTask?.id) {
						(async () => {
							const newLinkedIssue = {
								...res.data,
								taskFrom: childTask,
								taskTo: parentTask
							};
							setDetailedTask({
								...detailedTask,
								linkedIssues: [...(detailedTask?.linkedIssues || []), newLinkedIssue as any]
							});
						})();
					}
				})
				.catch(console.error);

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, queryCall, loadTeamTasksData, modal]
	);

	const isTaskEpic = task.issueType === EIssueType.EPIC;
	const isTaskStory = task.issueType === EIssueType.STORY;
	const linkedTasks = task.linkedIssues?.map((t) => t.taskFrom?.id) || [];

	const unlinkedTasks = tasks.filter((childTask) => {
		const hasChild = () => {
			if (isTaskEpic) {
				return childTask.issueType !== EIssueType.EPIC;
			} else if (isTaskStory) {
				return childTask.issueType !== EIssueType.EPIC && childTask.issueType !== EIssueType.STORY;
			} else {
				return (
					childTask.issueType === EIssueType.BUG ||
					childTask.issueType === EIssueType.TASK ||
					childTask.issueType === null
				);
			}
		};

		return childTask.id !== task.id && !linkedTasks.includes(childTask.id) && hasChild();
	});

	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
			<div className="w-[98%] md:w-[42rem] relative">
				{loading && (
					<div className="flex absolute inset-0 z-10 justify-center items-center bg-black/30">
						<SpinnerLoader />
					</div>
				)}
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center w-full">
						<Text.Heading as="h3" className="mb-2 text-center">
							{t('common.LINK_TASK')}
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
				</EverCard>
			</div>
		</Modal>
	);
}
