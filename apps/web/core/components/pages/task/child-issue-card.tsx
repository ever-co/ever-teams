import { Modal, SpinnerLoader, Text } from '@/core/components';
import { IHookModal, useModal, useTeamTasks } from '@/core/hooks';
import { useCallback, useState } from 'react';
import { clsxm } from '@/core/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import { AddIcon } from 'assets/svg';
import { EverCard } from '../../common/ever-card';
import { TaskLinkedIssue } from '../../tasks/task-linked-issue';
import { TaskInput } from '../../tasks/task-input';
import { EIssueType } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { tasksByTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export const ChildIssueCard: FC<{ task: TTask }> = ({ task }) => {
	const t = useTranslations();
	const modal = useModal();

	const [hidden, setHidden] = useState(false);

	return (
		<EverCard
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-[1.125rem] border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<p className="text-base font-semibold">{t('common.CHILD_ISSUES')}</p>
				<div className="flex items-center justify-end gap-2.5">
					<div className="border-r border-r-[#0000001A] flex items-center gap-2.5">
						<span onClick={modal.openModal}>
							<AddIcon className="h-4 w-4 text-[#B1AEBC] dark:text-white cursor-pointer mr-1.5" />
						</span>
					</div>

					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>

			{task.children?.length ? (
				<div className={clsxm('flex flex-col max-h-96 gap-3 overflow-y-auto', hidden && ['hidden'])}>
					{task.children?.map((task) => {
						return <TaskLinkedIssue key={task.id} task={task} className="dark:bg-[#25272D] py-0" />;
					})}
				</div>
			) : null}

			{task && <CreateChildTask task={task} modal={modal} />}
		</EverCard>
	);
};

function CreateChildTask({ modal, task }: { modal: IHookModal; task: TTask }) {
	const t = useTranslations();
	const tasks = useAtomValue(tasksByTeamState);

	const { updateTask, loadTeamTasksData } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (childTask: TTask | undefined) => {
			if (!childTask) return;

			setLoading(true);
			task.children = [...(task.children || []), childTask];
			const taskUpdate = {
				...childTask,
				id: childTask.id,
				parentId: task.id,
				parent: { ...task, id: task.id }
			};

			await updateTask({ ...taskUpdate });

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, updateTask, loadTeamTasksData, modal]
	);

	const isTaskEpic = task.issueType === EIssueType.EPIC;
	const isTaskStory = task.issueType === EIssueType.STORY;
	const childTasks = task.children?.map((t) => t.id) || [];

	const unchildTasks = tasks.filter((childTask) => {
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

		return childTask.id !== task.id && !childTasks.includes(childTask.id) && hasChild();
	});

	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
			<div className="w-[98%] md:w-[45rem]  relative">
				{loading && (
					<div className="flex absolute inset-0 z-10 justify-center items-center bg-black/30">
						<SpinnerLoader />
					</div>
				)}
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center w-full">
						<Text.Heading as="h3" className="mb-2 text-center">
							{t('common.CHILD_ISSUE_TASK')}
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
						tasks={unchildTasks}
						onTaskClick={onTaskSelect}
						onTaskCreated={onTaskSelect}
						cardWithoutShadow={true}
					/>
				</EverCard>
			</div>
		</Modal>
	);
}
