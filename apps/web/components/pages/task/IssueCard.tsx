/* eslint-disable no-mixed-spaces-and-tabs */
import {
	Card,
	Dropdown,
	DropdownItem,
	Modal,
	SpinnerLoader,
	Text,
} from 'lib/components';
import { TaskInput, TaskLinkedIssue } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import {
	IHookModal,
	useModal,
	useQuery,
	useSyncRef,
	useTeamTasks,
} from '@app/hooks';
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

	const { actionType, actionTypeItems, onChange } = useActionType();

	const linkedTasks = useMemo(() => {
		const issues =
			task?.linkedIssues
				?.filter((t) => {
					return t.action == actionType?.data?.value;
				})
				.map<ITeamTask>((t) => {
					return tasks.find((ts) => ts.id === t.taskFrom.id) || t.taskFrom;
				})
				.filter(Boolean) || [];

		return issues;
	}, [task, tasks, actionType]);

	return (
		<Card
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-[1.125rem] border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<p className="text-base font-semibold">{trans.common.RELATED_ISSUES}</p>

				{/* <p className="text-base font-semibold">{trans.common.CHILD_ISSUES}</p>*/}

				<div className="flex items-center justify-end gap-2.5">
					<div className="border-r border-r-[#0000001A] flex items-center gap-2.5">
						<span onClick={modal.openModal}>
							<PlusIcon className="h-7 w-7 stroke-[#B1AEBC] dark:stroke-white cursor-pointer" />
						</span>
					</div>

					<Dropdown
						className="min-w-[150px] max-w-sm z-10 dark:bg-dark--theme-light"
						// buttonClassName={clsxm(
						// 	'py-0 font-medium h-[45px] w-[145px] z-10 outline-none dark:bg-dark--theme-light'
						// )}
						value={actionType}
						onChange={onChange}
						items={actionTypeItems}
						// optionsClassName={'outline-none'}
					/>

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

			{task && actionType && (
				<CreateLinkedTask actionType={actionType} task={task} modal={modal} />
			)}
		</Card>
	);
};

function CreateLinkedTask({
	modal,
	task,
	actionType,
}: {
	modal: IHookModal;
	task: ITeamTask;
	actionType: ActionTypeItem;
}) {
	const { trans } = useTranslation();
	const $actionType = useSyncRef(actionType);

	const { tasks, loadTeamTasksData } = useTeamTasks();
	const { queryCall } = useQuery(createTaskLinkedIsssueAPI);
	const [loading, setLoading] = useState(false);

	const onTaskSelect = useCallback(
		async (childTask: ITeamTask | undefined) => {
			if (!childTask || !$actionType.current.data) return;
			setLoading(true);
			const parentTask = task;

			await queryCall({
				taskFromId: childTask?.id,
				taskToId: parentTask.id,

				organizationId: task.organizationId,
				action: $actionType.current.data.value,
			}).catch(console.error);

			loadTeamTasksData(false).finally(() => {
				setLoading(false);
				modal.closeModal();
			});
		},
		[task, queryCall, loadTeamTasksData, modal, $actionType]
	);

	const isTaskEpic = task.issueType === 'Epic';
	const isTaskStory = task.issueType === 'Story';
	const linkedTasks = task.linkedIssues?.map((t) => t.taskFrom.id) || [];

	const unlinkedTasks = tasks.filter((childTask) => {
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
			!linkedTasks.includes(childTask.id) &&
			hasChild()
		);
	});

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

type ActionType = { name: string; value: TaskRelatedIssuesRelationEnum };
type ActionTypeItem = DropdownItem<ActionType>;

function mapToActionType(items: ActionType[] = []) {
	return items.map<ActionTypeItem>((item) => {
		return {
			key: item.value,
			Label: () => {
				return (
					<button
						className={clsxm(
							'whitespace-nowrap mb-2 w-full',
							'flex justify-start flex-col'
						)}
					>
						<span className="pb-1">{item.name}</span>
						<hr className="h-[1px] text-red-400 w-full" />
					</button>
				);
			},
			selectedLabel: <span className="flex">{item.name}</span>,
			data: item,
		};
	});
}

function useActionType() {
	const { trans } = useTranslation();

	const actionsTypes = useMemo(
		() => [
			{
				name: trans.common.BLOCKS,
				value: TaskRelatedIssuesRelationEnum.BLOCKS,
			},
			{
				name: trans.common.CLONES,
				value: TaskRelatedIssuesRelationEnum.CLONES,
			},
			{
				name: trans.common.DUPLICATES,
				value: TaskRelatedIssuesRelationEnum.DUPLICATES,
			},
			{
				name: trans.common.IS_BLOCKED_BY,
				value: TaskRelatedIssuesRelationEnum.IS_BLOCKED_BY,
			},
			{
				name: trans.common.IS_CLONED_BY,
				value: TaskRelatedIssuesRelationEnum.IS_CLONED_BY,
			},
			{
				name: trans.common.IS_DUPLICATED_BY,
				value: TaskRelatedIssuesRelationEnum.IS_DUPLICATED_BY,
			},
			{
				name: trans.common.RELATES_TO,
				value: TaskRelatedIssuesRelationEnum.RELATES_TO,
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const actionTypeItems = useMemo(
		() => mapToActionType(actionsTypes),
		[actionsTypes]
	);

	const relatedToItem = useMemo(
		() =>
			actionTypeItems.find(
				(t) => t.key === TaskRelatedIssuesRelationEnum.RELATES_TO
			),
		[actionTypeItems]
	);

	const [actionType, setActionType] = useState<ActionTypeItem | null>(
		relatedToItem || null
	);

	const onChange = useCallback(
		(item: ActionTypeItem) => {
			setActionType(item);
		},
		[setActionType]
	);

	return {
		actionTypeItems,
		actionType,
		onChange,
	};
}
