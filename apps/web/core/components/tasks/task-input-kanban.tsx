'use client';

import {
	HostKeys,
	RTuseTaskInput,
	useCallbackRef,
	useHotkeys,
	useOutsideClick,
	useTaskInput,
	useTaskLabels,
	useTaskStatus
} from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/task';
import { timerStatusState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, SpinnerLoader } from '@/core/components';
import { RefObject, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState, JSX } from 'react';
import { useAtomValue } from 'jotai';
import { TaskIssuesDropdown } from './task-issue';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { TaskLabels } from './task-labels';
import { InputField } from '../duplicated-components/_input';
import { EverCard } from '../common/ever-card';
import { Tooltip } from '../duplicated-components/tooltip';
import { Nullable } from '@/core/types/generics/utils';
import { ETaskSizeName, ETaskPriority, EIssueType } from '@/core/types/generics/enums/task';

type Props = {
	task?: Nullable<ITask>;
	tasks?: ITask[];
	kanbanTitle?: string;
	onTaskClick?: (task: ITask) => void;
	initEditMode?: boolean;
	onCloseCombobox?: () => void;
	inputLoader?: boolean;
	onEnterKey?: (taskName: string, task: ITask) => void;
	keepOpen?: boolean;
	loadingRef?: RefObject<boolean>;
	closeable_fc?: () => void;
	viewType?: 'input-trigger' | 'one-view';
	createOnEnterClick?: boolean;
	showTaskNumber?: boolean;
	showCombobox?: boolean;
	autoAssignTaskAuth?: boolean;
	fullWidthCombobox?: boolean;
	fullHeightCombobox?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
	autoInputSelectText?: boolean;
	usersTaskCreatedAssignTo?: { id: string }[];
	onTaskCreated?: (task: ITask | undefined) => void;
	cardWithoutShadow?: boolean;
	onClose: any;

	forParentChildRelationship?: boolean;
} & PropsWithChildren;

/**
 * If task passed then some function should not considered as global state
 *
 * @param param0
 * @returns
 */

export function TaskInputKanban(props: Props) {
	const t = useTranslations();

	const { viewType = 'input-trigger', showTaskNumber = false } = props;

	const datas = useTaskInput({
		task: props.task,
		initEditMode: props.initEditMode,
		tasks: props.tasks
	});

	const onCloseComboboxRef = useCallbackRef(props.onCloseCombobox);
	const closeable_fcRef = useCallbackRef(props.closeable_fc);
	const $onTaskCreated = useCallbackRef(props.onTaskCreated);
	const inputRef = useRef<HTMLDivElement>(null);
	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);

	const onTaskCreated = useCallback(
		(task: ITask | undefined) => $onTaskCreated.current && $onTaskCreated.current(task),
		[$onTaskCreated]
	);

	const {
		inputTask,
		setTaskIssue,
		editMode,
		setEditMode,
		setQuery,
		updateLoading,
		updateTaskTitleHandler,
		setFilter
	} = datas;

	const inputTaskTitle = useMemo(() => inputTask?.title || '', [inputTask?.title]);

	const [taskName, setTaskName] = useState('');

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLInputElement>(
		() => !props.keepOpen && setEditMode(false)
	);

	useEffect(() => {
		setQuery(taskName === inputTask?.title ? '' : taskName);
	}, [taskName, inputTask, setQuery]);

	useEffect(() => {
		setTaskName(inputTaskTitle);
	}, [editMode, inputTaskTitle]);

	useEffect(() => {
		/**
		 * Call onCloseCombobox only when the menu has been closed
		 */
		!editMode && onCloseComboboxRef.current && onCloseComboboxRef.current();
	}, [editMode, onCloseComboboxRef]);

	/**
	 * On update task name
	 */
	const updateTaskNameHandler = useCallback(
		(task: ITask, title: string) => {
			if (task.title !== title) {
				!updateLoading && updateTaskTitleHandler(task, title);
			}
		},
		[updateLoading, updateTaskTitleHandler]
	);

	/**
	 * Signle parent about updating and close event (that can trigger close component e.g)
	 */
	useEffect(() => {
		if (props.loadingRef?.current && !updateLoading) {
			closeable_fcRef.current && closeable_fcRef.current();
		}

		if (props.loadingRef) {
			props.loadingRef.current = updateLoading;
		}
	}, [updateLoading, props.loadingRef, closeable_fcRef]);

	/* Setting the filter to open when the edit mode is true. */
	useEffect(() => {
		editMode && setFilter('open');
	}, [editMode, setFilter]);

	/*
    If task is passed then we don't want to set the active task for the authenticated user.
    after task creation
   */
	const handleTaskCreation = useCallback(async () => {
		/* Checking if the `handleTaskCreation` is available and if the `hasCreateForm` is true. */
		datas &&
			datas.handleTaskCreation &&
			datas.hasCreateForm &&
			datas
				.handleTaskCreation({
					autoActiveTask: true,
					autoAssignTaskAuth: props.autoAssignTaskAuth,
					assignToUsers: props.usersTaskCreatedAssignTo || []
				})
				?.then(onTaskCreated)
				.finally(async () => {
					setTaskName('');

					props.onClose && props.onClose();
				});
	}, [datas, props, onTaskCreated]);

	const updatedTaskList = useMemo(() => {
		let updatedTaskList: ITask[] = [];
		if (props.forParentChildRelationship) {
			if (
				// Story can have ParentId set to Epic ID
				props.task?.issueType === EIssueType.STORY
			) {
				updatedTaskList = datas.filteredTasks.filter((item) => item.issueType === 'Epic');
			} else if (
				// TASK|BUG can have ParentId to be set either to Story ID or Epic ID
				props.task?.issueType === EIssueType.TASK ||
				props.task?.issueType === EIssueType.BUG ||
				!props.task?.issueType
			) {
				updatedTaskList = datas.filteredTasks.filter(
					(item) => item.issueType === EIssueType.EPIC || item.issueType === EIssueType.STORY
				);
			} else {
				updatedTaskList = datas.filteredTasks;
			}

			if (props.task?.children && props.task?.children?.length) {
				const childrenTaskIds = props.task?.children?.map((item) => item.id);
				updatedTaskList = updatedTaskList.filter((item) => !childrenTaskIds.includes(item.id));
			}
		}

		return updatedTaskList;
	}, [props.task, datas.filteredTasks]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (inputRef.current && !inputRef.current.contains(event.target as Node) && editMode) {
				inputTask && updateTaskNameHandler(inputTask, taskName);
			}
		};

		// Attach the event listener
		document.addEventListener('mousedown', handleClickOutside);

		// Clean up the event listener on component unmount
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [inputTask, taskName, updateTaskNameHandler, editMode]);

	// Handling Hotkeys
	const handleCommandKeySequence = useCallback(() => {
		if (!editMode) {
			setEditMode(true);
			if (targetEl.current) {
				targetEl.current.focus();
			}
		} else {
			setEditMode(false);
		}
	}, [setEditMode, editMode, targetEl]);
	useHotkeys(HostKeys.CREATE_TASK, handleCommandKeySequence);

	useEffect(() => {
		if (props.autoFocus && targetEl.current) {
			targetEl.current.focus();
		}
	}, [props.autoFocus, targetEl]);

	const inputField = (
		<InputField
			// value={taskName}
			disabled={timerRunningStatus}
			// ref={targetEl}
			autoFocus={props.autoFocus}
			wrapperClassName={`rounded-lg dark:bg-[#1B1D22]`}
			placeholder={props.placeholder || t('form.TASK_INPUT_PLACEHOLDER')}
			onFocus={(e) => {
				setEditMode(true);
				props.autoInputSelectText && setTimeout(() => e?.target?.select(), 10);
			}}
			onChange={(event) => {
				setTaskName(event.target.value);
			}}
			onKeyUp={(e) => {
				if (e.key === 'Enter' && inputTask) {
					/* If createOnEnterClick is false then updateTaskNameHandler is called. */
					!props.createOnEnterClick && updateTaskNameHandler(inputTask, taskName);

					props.onEnterKey && props.onEnterKey(taskName, inputTask);
				}
				/* Creating a new task when the enter key is pressed. */
				if (e.key === 'Enter') {
					props.createOnEnterClick && handleTaskCreation();
				}
			}}
			trailingNode={
				/* Showing the spinner when the task is being updated. */
				<div className="flex items-center justify-center h-full p-2">
					{props.task ? (
						(updateLoading || props.inputLoader) && <SpinnerLoader size={25} />
					) : (
						<>{updateLoading && <SpinnerLoader size={25} />}</>
					)}
				</div>
			}
			className={clsxm(
				showTaskNumber && inputTask && ['pl-2'],
				'dark:bg-[#1B1D22]',
				props.initEditMode && 'h-10'
			)}
			/* Showing the task number. */
			leadingNode={
				// showTaskNumber &&
				// inputTask &&
				<div className="relative flex items-center pl-3 space-x-2" ref={ignoreElementRef}>
					<TaskIssuesDropdown
						taskStatusClassName="!px-1 py-1 rounded-sm"
						showIssueLabels={false}
						onValueChange={(v: any) => setTaskIssue(v)}
					/>
				</div>
			}
		/>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			inputField={viewType ? inputField : undefined}
			fullWidth={props.fullWidthCombobox}
			fullHeight={props.fullHeightCombobox}
			kanbanTitle={props.kanbanTitle ?? 'open'}
			handleTaskCreation={handleTaskCreation}
			cardWithoutShadow={props.cardWithoutShadow}
			updatedTaskList={updatedTaskList}
		/>
	);

	return taskCard;
}

/**
 * A component that is used to render the task list.
 */
function TaskCard({
	datas,
	inputField,
	kanbanTitle,
	handleTaskCreation
}: {
	datas: Partial<RTuseTaskInput>;
	inputField?: JSX.Element;
	kanbanTitle: string;
	fullWidth?: boolean;
	fullHeight?: boolean;
	handleTaskCreation: () => void;
	cardWithoutShadow?: boolean;
	updatedTaskList?: ITask[];
}) {
	const t = useTranslations();
	const activeTaskEl = useRef<HTMLLIElement | null>(null);
	const { taskLabels: taskLabelsData } = useTaskLabels();

	const { taskStatus, taskPriority, taskSize, taskDescription, taskLabels } = datas;
	useEffect(() => {
		if (taskStatus) {
			taskStatus.current = kanbanTitle ?? 'open';
		}
	}, [taskStatus, datas.hasCreateForm, kanbanTitle]);
	useEffect(() => {
		if (datas.editMode) {
			window.setTimeout(() => {
				activeTaskEl?.current?.scrollIntoView({
					block: 'nearest',
					inline: 'start'
				});
			}, 10);
		}
	}, [datas.editMode]);
	const taskStatusHook = useTaskStatus();
	return (
		<EverCard shadow="custom">
			<>
				{inputField}
				<div>
					{/* Create team button */}

					<div className="flex flex-col gap-y-2">
						{datas.hasCreateForm && (
							<div>
								<InputField
									placeholder="Description"
									onChange={(e) => {
										if (taskDescription) {
											taskDescription.current = e.target.value;
										}
									}}
									className={'dark:bg-[#1B1D22]'}
								/>

								<div className="flex flex-wrap justify-start gap-2">
									<ActiveTaskPropertiesDropdown
										className="min-w-fit lg:max-w-[170px]"
										taskStatusClassName="h-7 text-xs"
										onValueChange={(v: any) => {
											if (v && taskPriority) {
												taskPriority.current = v;
											}
										}}
										defaultValue={taskPriority?.current as ETaskPriority}
										task={null}
									/>

									<ActiveTaskSizesDropdown
										className="min-w-fit lg:max-w-[170px]"
										taskStatusClassName="h-7 text-xs"
										onValueChange={(v: any) => {
											if (v && taskSize) {
												taskSize.current = v;
											}
										}}
										defaultValue={taskSize?.current as ETaskSizeName}
										task={null}
									/>
									<TaskLabels
										className="min-w-fit lg:max-w-[170px] text-xs"
										forDetails={false}
										taskStatusClassName="border dark:bg-[#1B1D22] dark:border-[#FFFFFF33] h-8 text-xs"
										onValueChange={(_: any, values: string[] | undefined) => {
											taskLabelsData.filter((tag) =>
												tag.name ? values?.includes(tag.name) : false
											);

											if (taskLabels && values?.length) {
												taskLabels.current = taskLabelsData.filter((tag) =>
													tag.name ? values?.includes(tag.name) : false
												);
											}
										}}
										task={datas.inputTask}
									/>
								</div>
							</div>
						)}

						<Tooltip
							enabled={!datas.user?.isEmailVerified}
							label={t('common.VERIFY_ACCOUNT_MSG')}
							placement="top-start"
							className="inline-block"
						>
							<Button
								variant="outline"
								disabled={!datas.hasCreateForm || datas.createLoading || !datas.user?.isEmailVerified}
								loading={datas.createLoading}
								className="font-normal text-sm rounded-xl min-w-[240px] max-w-[230px] inline-flex"
								onClick={() => {
									handleTaskCreation();
									setTimeout(() => {
										taskStatusHook.loadTaskStatuses();
									}, 4000);
								}}
							>
								{!datas.createLoading && <PlusIcon className="w-[16px] h-[16px]" />}
								{t('common.CREATE_TASK')}
							</Button>
						</Tooltip>
					</div>
				</div>
			</>
			<div className="w-2 h-5 opacity-0">{'|'}</div>
		</EverCard>
	);
}
