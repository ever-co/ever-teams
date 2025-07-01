'use client';

import {
	HostKeys,
	RTuseTaskInput,
	useCallbackRef,
	useHotkeys,
	useOutsideClick,
	useTaskInput,
	useTaskStatus
} from '@/core/hooks';
import { taskLabelsListState, taskPrioritiesListState, taskSizesListState, timerStatusState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, SpinnerLoader } from '@/core/components';
import { RefObject, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState, JSX } from 'react';
import { useAtomValue } from 'jotai';
import { TaskIssuesDropdown } from './task-issue';
import { useTranslations } from 'next-intl';
import { InputField } from '../duplicated-components/_input';
import { EverCard } from '../common/ever-card';
import { Tooltip } from '../duplicated-components/tooltip';
import { Nullable } from '@/core/types/generics/utils';
import { ETaskSizeName, ETaskPriority, EIssueType, ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTag, TTask } from '@/core/types/schemas/task/task.schema';
import { Select } from '../features/projects/add-or-edit-project/steps/basic-information-form';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { X } from 'lucide-react';
import { getTextColor } from '@/core/lib/helpers/colors';

type Props = {
	task?: Nullable<TTask>;
	tasks?: TTask[];
	kanbanTitle?: string;
	onTaskClick?: (task: TTask) => void;
	initEditMode?: boolean;
	onCloseCombobox?: () => void;
	inputLoader?: boolean;
	onEnterKey?: (taskName: string, task: TTask) => void;
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
	onTaskCreated?: (task: TTask | undefined) => void;
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
		(task: TTask | undefined) => $onTaskCreated.current && $onTaskCreated.current(task as any),
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
		setFilter,
		taskIssue
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
		(task: TTask, title: string) => {
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
		let updatedTaskList: TTask[] = [];
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
				showTaskNumber && inputTask && ['pl-6'],
				'dark:bg-[#1B1D22]',
				props.initEditMode && 'h-10'
			)}
			/* Showing the task number. */
			leadingNode={
				// showTaskNumber &&
				// inputTask &&
				<div className=" flex items-center justify-center w-10 h-full" ref={ignoreElementRef}>
					<TaskIssuesDropdown
						taskStatusClassName="!px-1 py-1 rounded-sm"
						showIssueLabels={false}
						onValueChange={(v: any) => setTaskIssue(v)}
						value={taskIssue}
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
	updatedTaskList?: TTask[];
}) {
	const t = useTranslations();
	const activeTaskEl = useRef<HTMLLIElement | null>(null);
	const {
		taskStatus,
		taskPriority: activeTaskPriority,
		taskSize: activeTaskSize,
		taskDescription,
		taskLabels: activeTaskLabels
	} = datas;

	useEffect(() => {
		if (taskStatus) {
			taskStatus.current =
				Object.values(ETaskStatusName).find((status) => status === kanbanTitle) ?? ETaskStatusName.OPEN;
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
	const taskPriorities = useAtomValue(taskPrioritiesListState);
	const taskSizes = useAtomValue(taskSizesListState);
	const taskLabels = useAtomValue(taskLabelsListState);
	const [taskPriority, setTaskPriority] = useState<ETaskPriority | undefined>(
		activeTaskPriority?.current as ETaskPriority | undefined
	);
	const [taskSize, setTaskSize] = useState<ETaskSizeName | undefined>(
		activeTaskSize?.current as ETaskSizeName | undefined
	);
	const [selectedTaskLabels, setSelectedTaskLabels] = useState(activeTaskLabels?.current.map((el) => el.name) ?? []);

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
									<div className="w-28 h-[2rem]">
										<Select
											placeholder="Task priority"
											options={taskPriorities.map((el) => ({
												...el,
												id: el.value,
												value: el.name
											}))}
											selected={taskPriority as string}
											onChange={(value) => {
												setTaskPriority(value as ETaskPriority);
												if (activeTaskPriority) {
													activeTaskPriority.current = value as ETaskPriority;
												}
											}}
											selecteTriggerClassName={cn(
												'w-28 h-[30px]  overflow-hidden py-0 rounded-md hover:bg-transparent',
												taskSize ? ' gap-1 border px-2' : 'border px-2  gap-[.5rem]'
											)}
											selectTriggerStyles={
												taskPriority
													? {
															backgroundColor:
																taskPriorities.find((el) => el.value == taskPriority)
																	?.color ?? undefined
														}
													: {}
											}
											selectOptionsListClassName="w-32 h-full"
											renderItem={(item) => (
												<div
													style={{ backgroundColor: item.color ?? undefined }}
													className="flex w-full items-center gap-2 py-1 px-2 rounded-md"
												>
													<div className="w-[1.2rem] flex items-center justify-center h-[1.2rem] p-[.02rem] rounded">
														{item.fullIconUrl && (
															<Image
																className="object-cover w-full h-full rounded-md"
																src={item.fullIconUrl}
																alt={item.name + 'icon'}
																width={40}
																height={40}
															/>
														)}
													</div>
													<span className=" text-xs">{item.name}</span>
												</div>
											)}
											alignOptionsList="center"
											renderValue={(value) => {
												const item = taskPriorities.find((el) => el.value == value);

												return (
													<div className="flex w-full items-center h-full  gap-2">
														{value ? (
															<div className="flex w-full h-full items-center gap-2 rounded-md">
																<div className="w-[1rem] shrink-0 flex items-center justify-center h-[1rem] p-[.02rem] rounded">
																	{item?.fullIconUrl && (
																		<Image
																			className="object-cover w-full h-full rounded-md"
																			src={item.fullIconUrl}
																			alt={item.name + 'icon'}
																			width={30}
																			height={30}
																		/>
																	)}
																</div>
																<span className=" text-xs">{item?.name}</span>
															</div>
														) : (
															<div className="flex items-center gap-1">
																<div className="w-4 h-4 rounded-full border"></div>
																<p className=" text-xs text-slate-500  font-light ">
																	Priosity
																</p>
															</div>
														)}
													</div>
												);
											}}
										/>
									</div>

									<div className="w-28 h-[2rem]">
										<Select
											placeholder="Task size"
											options={taskSizes.map((el) => ({ ...el, id: el.value }))}
											selected={taskSize as string}
											onChange={(value) => {
												setTaskSize(value as ETaskSizeName);
												if (activeTaskSize) {
													activeTaskSize.current = value as ETaskSizeName;
												}
											}}
											selecteTriggerClassName={cn(
												'w-28 h-[30px]  overflow-hidden py-0 rounded-md hover:bg-transparent',
												taskSize ? ' gap-1 border px-2' : 'border px-2  gap-[.5rem]'
											)}
											selectTriggerStyles={
												taskSize
													? {
															backgroundColor:
																taskSizes.find((el) => el.value == taskSize)?.color ??
																undefined
														}
													: {}
											}
											selectOptionsListClassName="w-32 h-full"
											renderItem={(item) => (
												<div
													style={{ backgroundColor: item.color ?? undefined }}
													className="flex w-full items-center gap-2 py-1 px-2 rounded-md"
												>
													<div className="w-[1.2rem] flex items-center justify-center h-[1.2rem] p-[.02rem] rounded">
														{item.fullIconUrl && (
															<Image
																className="object-cover w-full h-full rounded-md"
																src={item.fullIconUrl}
																alt={item.name + 'icon'}
																width={40}
																height={40}
															/>
														)}
													</div>
													<span className=" text-xs">{item.name}</span>
												</div>
											)}
											alignOptionsList="center"
											renderValue={(value) => {
												const item = taskSizes.find((el) => el.value == value);

												return (
													<div className="flex w-full items-center h-full  gap-2">
														{value ? (
															<div className="flex w-full h-full items-center gap-2 rounded-md">
																<div className="w-[1rem] shrink-0 flex items-center justify-center h-[1rem] p-[.02rem] rounded">
																	{item?.fullIconUrl && (
																		<Image
																			className="object-cover w-full h-full rounded-md"
																			src={item.fullIconUrl}
																			alt={item.name + 'icon'}
																			width={30}
																			height={30}
																		/>
																	)}
																</div>
																<span className=" text-xs">{item?.name}</span>
															</div>
														) : (
															<div className="flex items-center gap-1">
																<div className="w-4 h-4 rounded-full border"></div>
																<p className=" text-xs text-slate-500  font-light ">
																	Size
																</p>
															</div>
														)}
													</div>
												);
											}}
										/>
									</div>

									<div className="w-28 h-[2rem]">
										<Select
											placeholder="Task labels"
											options={taskLabels.map((el) => ({ ...el, id: el.name, value: el.name }))}
											selected={selectedTaskLabels}
											onChange={(value) => {
												setSelectedTaskLabels(value as string[]);
												if (activeTaskLabels) {
													activeTaskLabels.current = Array.isArray(value)
														? value.map(
																(el) =>
																	taskLabels.find((item) => item.name === el) as TTag
															)
														: [];
												}
											}}
											multiple
											selecteTriggerClassName={cn(
												'w-28 h-[30px]  overflow-hidden py-0 rounded-md hover:bg-transparent',
												selectedTaskLabels?.length
													? ' gap-1 border px-2'
													: 'border px-2  gap-[.5rem]'
											)}
											selectOptionsListClassName="w-32 h-full"
											renderItem={(item) => (
												<div
													style={{ backgroundColor: item.color ?? undefined }}
													className="flex w-full items-center gap-2 py-1 px-2 rounded-md relative"
												>
													<div className="w-[1.2rem] flex items-center justify-center h-[1.2rem] p-[.02rem] rounded">
														{item.fullIconUrl && (
															<Image
																className="object-cover w-full h-full rounded-md"
																src={item.fullIconUrl}
																alt={item.name + 'icon'}
																width={40}
																height={40}
															/>
														)}
													</div>
													<span
														style={{ color: getTextColor(item.color ?? 'white') }}
														className=" text-xs"
													>
														{item.name}
													</span>
													{selectedTaskLabels?.includes(item.name) && (
														<div
															onClick={() =>
																setSelectedTaskLabels(
																	selectedTaskLabels.filter((el) => el !== item.name)
																)
															}
															className="flex absolute items-center right-1 top-1/2 -translate-y-1/2 justify-center"
														>
															<X size={10} />
														</div>
													)}
												</div>
											)}
											alignOptionsList="center"
											renderValue={(value) => {
												return (
													<div className="flex w-full items-center h-full  gap-2">
														{selectedTaskLabels.length ? (
															<div
																className={cn(
																	'flex w-full h-full items-center gap-2 rounded-md',
																	selectedTaskLabels.length > 0
																		? ''
																		: 'text-slate-500 '
																)}
															>
																<span className=" text-xs">{`${selectedTaskLabels.length} ${selectedTaskLabels.length > 1 ? 'Items' : 'Item'}`}</span>
															</div>
														) : (
															<div className="flex items-center gap-1">
																<div className="w-4 h-4 rounded-full border"></div>
																<p className=" text-xs text-slate-500  font-light ">
																	Labels
																</p>
															</div>
														)}
													</div>
												);
											}}
										/>
									</div>
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
