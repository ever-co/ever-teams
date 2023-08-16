import { Card, Modal, SpinnerLoader, Text } from 'lib/components';
import { TaskInput, TaskLinkedIssue } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { IHookModal, useModal, useTeamTasks } from '@app/hooks';
import { ITeamTask } from '@app/interfaces';
import { useTranslation } from 'lib/i18n';
import { useCallback, useMemo, useState } from 'react';
import { clsxm } from '@app/utils';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from 'lib/components/svgs';

export const ChildIssueCard = () => {
	const { trans } = useTranslation();
	const modal = useModal();

	const task = useRecoilValue(detailedTaskState);
	const { tasks } = useTeamTasks();
	const [hidden, setHidden] = useState(false);

	const childTasks = useMemo(() => {
		const children = task?.children?.reduce((acc, item) => {
			const $item = tasks.find((ts) => ts.id === item.id) || item;
			if ($item) {
				acc.push($item);
			}
			return acc;
		}, [] as ITeamTask[]);

		return children || [];
	}, [task, tasks]);

	return (
		<Card
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-[1.125rem] border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<p className="text-base font-semibold">{trans.common.CHILD_ISSUES}</p>

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

			{childTasks.length > 0 && (
				<div
					className={clsxm(
						'flex flex-col max-h-80 gap-3',
						hidden && ['hidden']
					)}
				>
					{childTasks.map((task) => {
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

			{task && <CreateChildTask task={task} modal={modal} />}
		</Card>
	);
};

function CreateChildTask({
	modal,
	task,
}: {
	modal: IHookModal;
	task: ITeamTask;
}) {
	const { trans } = useTranslation();

	const { tasks, loadTeamTasksData } = useTeamTasks();
	const { updateTask } = useTeamTasks();

	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (childTask: ITeamTask | undefined) => {
			if (!childTask) return;

			setLoading(true);

			await updateTask({
				...childTask,
				parentId: task.id,
				parent: task,
			});

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, updateTask, loadTeamTasksData, modal]
	);

	const isTaskEpic = task.issueType === 'Epic';
	const isTaskStory = task.issueType === 'Story';
	const childTasks = task.children?.map((t) => t.id) || [];

	const unchildTasks = tasks.filter((childTask) => {
		const hasChild = () => {
			if (isTaskEpic) {
				return childTask.issueType !== 'Epic';
			} else if (isTaskStory) {
				return (
					childTask.issueType !== 'Epic' && childTask.issueType !== 'Story'
				);
			} else {
				return (
					childTask.issueType === 'Bug' ||
					childTask.issueType === 'Task' ||
					childTask.issueType === null
				);
			}
		};

		return (
			childTask.id !== task.id &&
			!childTasks.includes(childTask.id) &&
			hasChild()
		);
	});

	return (
		<Modal isOpen={modal.isOpen} closeModal={modal.closeModal}>
			<div className="w-[98%] md:w-[42rem]  relative">
				{loading && (
					<div className="absolute inset-0 bg-black/30 z-10 flex justify-center items-center">
						<SpinnerLoader />
					</div>
				)}
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center w-full">
						<Text.Heading as="h3" className="text-center mb-2">
							{trans.common.CHILD_ISSUE_TASK}
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
				</Card>
			</div>
		</Modal>
	);
}
