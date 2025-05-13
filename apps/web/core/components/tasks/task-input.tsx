'use client';

import {
	HostKeys,
	RTuseTaskInput,
	useAuthenticateUser,
	useCallbackRef,
	useHotkeys,
	useIssueType,
	useOrganizationEmployeeTeams,
	useOrganizationTeams,
	useOutsideClick,
	useTaskInput,
	useTaskLabels
} from '@/core/hooks';
import {
	IIssueTypesItemList,
	ITaskIssue,
	ITaskPriority,
	ITaskSize,
	ITaskStatus,
	ITeamTask,
	Nullable,
	OT_Member
} from '@/core/types/interfaces';
import { activeTeamTaskId, timerStatusState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Combobox, Popover, Transition } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/20/solid';
import { Button, Card, Divider, InputField, OutlineBadge, SpinnerLoader, Tooltip } from '@/core/components';
import { CircleIcon, CheckCircleTickIcon as TickCircleIcon } from 'assets/svg';
import { JSX, RefObject, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { ActiveTaskIssuesDropdown, TaskIssuesDropdown } from './task-issue';
import { TaskItem } from './task-items';
import { TaskLabels } from './task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { useInfinityScrolling } from '@/core/hooks/common/use-infinity-fetch';
import { ObserverComponent } from '@/core/components/Observer';
import { LazyRender } from '@/core/components/common/lazy-render';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';
import { cn } from '@/core/lib/helpers';

type Props = {
	task?: Nullable<ITeamTask>;
	tasks?: ITeamTask[];
	onTaskClick?: (task: ITeamTask) => void;
	initEditMode?: boolean;
	onCloseCombobox?: () => void;
	inputLoader?: boolean;
	onEnterKey?: (taskName: string, task: ITeamTask) => void;
	keepOpen?: boolean;
	loadingRef?: RefObject<boolean>;
	closeable_fc?: () => void;
	viewType?: 'input-trigger' | 'one-view';
	createOnEnterClick?: boolean;
	showTaskNumber?: boolean;
	showCombobox?: boolean;
	showEmoji?: boolean;
	autoAssignTaskAuth?: boolean;
	fullWidthCombobox?: boolean;
	fullHeightCombobox?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
	autoInputSelectText?: boolean;
	usersTaskCreatedAssignTo?: { id: string }[];
	onTaskCreated?: (task: ITeamTask | undefined) => void;
	cardWithoutShadow?: boolean;
	assignTaskPopup?: boolean;
	forParentChildRelationship?: boolean;
} & PropsWithChildren;

/**
 * If task passed then some function should not considered as global state
 *
 * @param param0
 * @returns
 */

export function TaskInput(props: Props) {
	const t = useTranslations();
	const { issueTypes } = useIssueType();
	const defaultIssueType: IIssueTypesItemList | undefined = issueTypes.find((issue) => issue.isDefault);

	const { viewType = 'input-trigger', showTaskNumber = false, showCombobox = true } = props;

	const datas = useTaskInput({
		task: props.task,
		initEditMode: props.initEditMode,
		tasks: props.tasks
	});

	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const onCloseComboboxRef = useCallbackRef(props.onCloseCombobox);
	const closeable_fcRef = useCallbackRef(props.closeable_fc);
	const $onTaskClick = useCallbackRef(props.onTaskClick);
	const $onTaskCreated = useCallbackRef(props.onTaskCreated);
	const inputRef = useRef<HTMLDivElement>(null);
	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);

	const onTaskCreated = useCallback(
		(task: ITeamTask | undefined) => $onTaskCreated.current && $onTaskCreated.current(task),
		[$onTaskCreated]
	);

	const onTaskClick = useCallback(
		(task: ITeamTask) => $onTaskClick.current && $onTaskClick.current(task),
		[$onTaskClick]
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
	const setActiveTask = useSetAtom(activeTeamTaskId);

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
	 * set the active task for the authenticated user
	 */
	const setAuthActiveTask = useCallback(
		(task: ITeamTask) => {
			if (datas.setActiveTask) {
				datas.setActiveTask(task);

				// Update Current user's active task to sync across multiple devices
				const currentEmployeeDetails = activeTeam?.members.find(
					(member) => member.employeeId === user?.employee?.id
				);
				if (currentEmployeeDetails && currentEmployeeDetails.id) {
					updateOrganizationTeamEmployee(currentEmployeeDetails.id, {
						organizationId: task.organizationId,
						activeTaskId: task.id,
						organizationTeamId: activeTeam?.id,
						tenantId: activeTeam?.tenantId
					});
				}
			}
			setEditMode(false);
		},
		[datas, setEditMode, activeTeam, user, updateOrganizationTeamEmployee]
	);

	/**
	 * On update task name
	 */
	const updateTaskNameHandler = useCallback(
		(task: ITeamTask, title: string) => {
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
	const autoActiveTask: boolean = props.task === undefined;
	const handleTaskCreation = useCallback(() => {
		/* Checking if the `handleTaskCreation` is available and if the `hasCreateForm` is true. */
		datas &&
			datas.handleTaskCreation &&
			datas.hasCreateForm &&
			datas
				.handleTaskCreation({
					autoActiveTask,
					autoAssignTaskAuth: props.autoAssignTaskAuth,
					assignToUsers: props.usersTaskCreatedAssignTo || []
				})
				?.then(onTaskCreated)
				.finally(() => {
					viewType === 'one-view' && setTaskName('');
				});
	}, [datas, props, autoActiveTask, onTaskCreated, viewType]);

	const updatedTaskList = useMemo(() => {
		let updatedTaskList: ITeamTask[] = [];
		if (props.forParentChildRelationship) {
			if (
				// Story can have ParentId set to Epic ID
				props.task?.issueType === 'Story'
			) {
				updatedTaskList = datas.filteredTasks.filter((item) => item.issueType === 'Epic');
			} else if (
				// TASK|BUG can have ParentId to be set either to Story ID or Epic ID
				props.task?.issueType === 'Task' ||
				props.task?.issueType === 'Bug' ||
				!props.task?.issueType
			) {
				updatedTaskList = datas.filteredTasks.filter(
					(item) => item.issueType === 'Epic' || item.issueType === 'Story'
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
	}, [props.forParentChildRelationship, props.task?.issueType, props.task?.children, datas.filteredTasks]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (inputRef.current && !inputRef.current.contains(event.target as Node) && editMode) {
				// inputTask && updateTaskNameHandler(inputTask, taskName);
				if (taskName == inputTaskTitle) {
					setEditMode(false);
					setActiveTask({
						id: ''
					});
				}
			}
		};

		// Attach the event listener
		document.addEventListener('mousedown', handleClickOutside);

		// Clean up the event listener on component unmount
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [inputTask, taskName, setActiveTask, updateTaskNameHandler, editMode, inputTaskTitle, setEditMode]);
	const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
	const handlePopoverToggle = useCallback(
		(popoverId: string) => {
			if (openPopoverId === popoverId) {
				setOpenPopoverId(null);
			} else {
				setOpenPopoverId(popoverId);
			}
		},
		[openPopoverId]
	);

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

	// const savedIssueType : string | null = localStorage.getItem('savedIssueType') as string && null;

	const inputField = (
		<InputField
			value={taskName}
			disabled={timerRunningStatus}
			ref={targetEl}
			emojis={props.showEmoji === undefined || props.showCombobox ? true : false}
			setTaskName={setTaskName}
			ignoreElementRefForTitle={ignoreElementRef as unknown as RefObject<HTMLDivElement>}
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
			/* Showing the task number and issue type */
			leadingNode={
				// showTaskNumber &&
				// inputTask &&
				<div className="flex items-center pl-3 space-x-2" ref={ignoreElementRef}>
					{!datas.hasCreateForm ? (
						<ActiveTaskIssuesDropdown
							key={(inputTask && inputTask.id) || ''}
							task={inputTask}
							forParentChildRelationship={true}
							taskStatusClassName={clsxm(
								inputTask && inputTask.issueType === 'Bug'
									? '!px-[0.3312rem] py-[0.2875rem] rounded-sm'
									: '!px-[0.375rem] py-[0.375rem] rounded-sm',
								'border-none'
							)}
						/>
					) : (
						<TaskIssuesDropdown
							taskStatusClassName="!px-1 py-1 rounded-sm"
							showIssueLabels={false}
							onValueChange={(v) => setTaskIssue(v)}
							defaultValue={
								defaultIssueType
									? defaultIssueType.name
									: (localStorage.getItem('lastTaskIssue') as ITaskIssue) || null
							}
						/>
					)}

					{!datas.hasCreateForm && (
						<span className="text-sm text-gray-500">#{(inputTask && inputTask.taskNumber) || ''}</span>
					)}
				</div>
			}
		/>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			onItemClick={props.task !== undefined || props.onTaskClick ? onTaskClick : setAuthActiveTask}
			inputField={viewType === 'one-view' ? inputField : undefined}
			fullWidth={props.fullWidthCombobox}
			fullHeight={props.fullHeightCombobox}
			handleTaskCreation={handleTaskCreation}
			cardWithoutShadow={props.cardWithoutShadow}
			assignTaskPopup={props.assignTaskPopup}
			updatedTaskList={updatedTaskList}
			forParentChildRelationship={props.forParentChildRelationship}
		/>
	);

	return viewType === 'one-view' ? (
		taskCard
	) : (
		<Popover onClick={() => handlePopoverToggle('popover1')} className="relative z-20 w-full" ref={inputRef}>
			<Tooltip
				label={t('common.TASK_INPUT_DISABLED_MESSAGE_WHEN_TIMER_RUNNING')}
				placement="top"
				enabled={timerRunningStatus}
			>
				{inputField}
			</Tooltip>
			{props.children}

			<Transition
				as="div"
				show={editMode && showCombobox}
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
			>
				<Popover.Panel
					className={clsxm('absolute -mt-3', props.fullWidthCombobox && ['w-full left-0 right-0'])}
					ref={ignoreElementRef}
				>
					{taskCard}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}

/**
 * A component that is used to render the task list.
 */
function TaskCard({
	datas,
	onItemClick,
	inputField,
	fullWidth,
	fullHeight,
	handleTaskCreation,
	cardWithoutShadow,
	forParentChildRelationship,
	updatedTaskList,
	assignTaskPopup
}: {
	datas: Partial<RTuseTaskInput>;
	onItemClick?: (task: ITeamTask) => void;
	inputField?: JSX.Element;
	fullWidth?: boolean;
	fullHeight?: boolean;
	handleTaskCreation: () => void;
	cardWithoutShadow?: boolean;
	forParentChildRelationship?: boolean;
	updatedTaskList?: ITeamTask[];
	assignTaskPopup?: boolean;
}) {
	const [, setCount] = useState(0);
	const t = useTranslations();
	const activeTaskEl = useRef<HTMLLIElement | null>(null);
	const { taskLabels: taskLabelsData } = useTaskLabels();
	const { activeTeam } = useOrganizationTeams();

	const { taskStatus, taskPriority, taskSize, taskLabels, taskDescription, taskProject, taskAssignees } = datas;
	const { nextOffset, data } = useInfinityScrolling(updatedTaskList ?? [], 5);

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

	return (
		<>
			<Card
				shadow="custom"
				className={clsxm(
					'rounded-xl md:px-4 md:py-4 overflow-hidden',
					!cardWithoutShadow && ['shadow-xl card'],
					fullWidth ? ['w-full'] : ['md:w-[500px]'],
					fullHeight ? 'h-full' : 'max-h-96'
				)}
			>
				<div className="flex flex-col gap-4">
					<>
						{inputField}
						{datas.hasCreateForm && (
							<div className="flex flex-col gap-2">
								<InputField
									placeholder="Description"
									emojis={true}
									onChange={(e) => {
										if (taskDescription) {
											taskDescription.current = e.target.value;
										}
									}}
									className={'dark:bg-[#1B1D22]'}
								/>

								<div className="flex justify-start gap-2">
									<ActiveTaskStatusDropdown
										className="min-w-fit lg:max-w-[170px]"
										taskStatusClassName="h-7 text-xs"
										onValueChange={(v) => {
											if (v && taskStatus) {
												taskStatus.current = v;
											}
											setCount((c) => c + 1);
										}}
										defaultValue={taskStatus?.current as ITaskStatus}
										task={null}
									/>

									<ActiveTaskPropertiesDropdown
										className="min-w-fit lg:max-w-[170px]"
										taskStatusClassName="h-7 text-xs"
										onValueChange={(v) => {
											if (v && taskPriority) {
												taskPriority.current = v;
											}
											setCount((c) => c + 1);
										}}
										defaultValue={taskPriority?.current as ITaskPriority}
										task={null}
									/>

									<ActiveTaskSizesDropdown
										className="min-w-fit lg:max-w-[170px]"
										taskStatusClassName="h-7 text-xs"
										onValueChange={(v) => {
											if (v && taskSize) {
												taskSize.current = v;
											}
											setCount((c) => c + 1);
										}}
										defaultValue={taskSize?.current as ITaskSize}
										task={null}
									/>

									<TaskLabels
										className="min-w-fit lg:max-w-[170px] text-xs z-[9999]"
										forDetails={true}
										taskStatusClassName="dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] h-full text-xs"
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

									{taskAssignees !== undefined && (
										<AssigneesSelect
											key={`assignees-${datas.inputTask?.id || 'new'}`}
											className="min-w-fit lg:max-w-[170px] bg-white"
											assignees={taskAssignees}
											teamMembers={activeTeam?.members ?? []}
										/>
									)}

									<ProjectDropDown
										styles={{
											container: 'rounded-xl min-w-fit max-w-[10.625rem]',
											listCard: 'rounded-xl'
										}}
										controlled
										onChange={(project) => {
											if (taskProject) {
												taskProject.current = project.id;
											}
										}}
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
								onClick={handleTaskCreation}
							>
								{!datas.createLoading && <PlusIcon className="w-[16px] h-[16px]" />}
								{t('common.CREATE_TASK')}
							</Button>
						</Tooltip>
					</>
					{/* Task filter buttons  */}
					<div className="flex mt-4 space-x-3">
						<OutlineBadge
							className="py-2 text-xs cursor-pointer input-border"
							onClick={() => datas.setFilter && datas.setFilter('open')}
						>
							<div className={clsxm('w-4 h-4 bg-green-300 rounded-full opacity-50')} />
							<span
								className={clsxm(
									datas.filter === 'open' && ['text-primary dark:text-primary-light font-semibold']
								)}
							>
								{datas.openTaskCount || 0} {t('common.OPEN')}
							</span>
						</OutlineBadge>

						<OutlineBadge
							className="py-2 text-xs cursor-pointer input-border"
							onClick={() => datas.setFilter && datas.setFilter('closed')}
						>
							<TickCircleIcon className="opacity-50 w-full max-w-[17px]" />
							<span
								className={clsxm(
									datas.filter === 'closed' && ['text-primary dark:text-primary-light font-semibold']
								)}
							>
								{datas.closedTaskCount || 0} {t('common.CLOSED')}
							</span>
						</OutlineBadge>
					</div>
				</div>

				<Divider className="mt-4" />
				{/* Task list */}
				<ul className={assignTaskPopup ? 'overflow-y-auto py-6 max-h-[40vh]' : 'overflow-y-auto py-6 max-h-56'}>
					{forParentChildRelationship && (
						<LazyRender items={data || []}>
							{(task, i) => {
								const last = (datas.filteredTasks?.length || 0) - 1 === i;
								const active = datas.inputTask === task;

								return (
									<li key={task.id} ref={active ? activeTaskEl : undefined}>
										<TaskItem
											task={task}
											selected={active}
											onClick={onItemClick}
											className="overflow-y-auto cursor-pointer"
										/>
										<ObserverComponent isLast={i === data.length - 1} getNextData={nextOffset} />
										{!last && <Divider className="my-5" />}
									</li>
								);
							}}
						</LazyRender>
					)}

					{!forParentChildRelationship && (
						<LazyRender items={datas.filteredTasks || []}>
							{(task, i) => {
								const last = (datas.filteredTasks?.length || 0) - 1 === i;
								const active = datas.inputTask === task;

								return (
									<li key={task.id} ref={active ? activeTaskEl : undefined}>
										<TaskItem
											task={task}
											selected={active}
											onClick={onItemClick}
											className="cursor-pointer"
										/>

										{!last && <Divider className="my-5" />}
									</li>
								);
							}}
						</LazyRender>
					)}

					{(forParentChildRelationship && updatedTaskList && updatedTaskList.length === 0) ||
						(!forParentChildRelationship && datas.filteredTasks && datas.filteredTasks.length === 0 && (
							<div className="text-center">{t('common.NO_TASKS')}</div>
						))}
				</ul>
			</Card>

			{/* Just some spaces at the end */}
			<div className="w-2 h-5 opacity-0">{'|'}</div>
		</>
	);
}

/**
 * ----------------------------------------------
 * ----------- ASSIGNEES MULTI SELECT -----------
 * ----------------------------------------------
 */

interface ITeamMemberSelectProps {
	teamMembers: OT_Member[];
	assignees?: RefObject<
		{
			id: string;
		}[]
	>;
	className?: string;
}
/**
 * A multi select component for assignees
 *
 * @param {object} props - The props object
 * @param {string[]} props.teamMembers - Members of the current team
 * @param {ITeamMemberSelectProps["assignees"]} props.assignees - Assigned members
 *
 * @return {JSX.Element} The multi select component
 */
function AssigneesSelect(props: ITeamMemberSelectProps & { key?: string }): React.ReactElement {
	const { teamMembers, assignees } = props;
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const authMember = useMemo(
		() => teamMembers.find((member) => member.employee.user?.id == user?.id),
		[teamMembers, user?.id]
	);

	return (
		<div
			className={cn(
				'max-w-52 border rounded-xl bg-[#F2F2F2] dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] px-3',
				props.className
			)}
		>
			<Combobox multiple={true}>
				<div className="relative h-full my-auto">
					<div className="w-full h-full overflow-hidden text-left rounded-lg cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm">
						<Combobox.Button className="flex items-center justify-between h-full min-w-fit max-w-40 hover:transition-all">
							<div
								className={cn(
									'flex gap-1 items-center  !text-default dark:!text-white text-xs',
									!assignees?.current?.length && ['!text-dark/40  dark:!text-white']
								)}
							>
								{!assignees?.current?.length ? (
									<CircleIcon className="w-4 h-4" />
								) : (
									<UserGroupIcon className="w-4 h-4" />
								)}
								{t('common.ASSIGNEE')}
							</div>
							<ChevronDownIcon className={clsxm('w-5 h-5 text-default dark:text-white')} />
						</Combobox.Button>
					</div>
					<Transition
						as="div"
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Combobox.Options className="absolute mt-1 max-h-40 h-auto overflow-auto rounded-md dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
							{authMember && (
								<Combobox.Option
									className={({ active }) =>
										`relative cursor-default select-none py-2 pl-10 pr-4 ${
											active
												? 'bg-primary/5 dark:text-gray-100 dark:bg-dark--theme-lights'
												: 'text-gray-900 dark:text-gray-200'
										}`
									}
									value={authMember}
								>
									<span className={`flex absolute inset-y-0 left-0 items-center pl-3`}>
										<CheckIcon className="w-5 h-5" aria-hidden="true" />
									</span>
									<span className="text-xs text-nowrap whitespace-nowrap">
										{authMember.employee.fullName}
									</span>
								</Combobox.Option>
							)}

							{teamMembers
								.filter((member) => member.employee.user?.id != user?.id)
								.map((member) => (
									<Combobox.Option
										key={member.id}
										className={({ active }) =>
											`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
												active
													? 'bg-primary/5 dark:text-gray-100 dark:bg-dark--theme-lights'
													: 'text-gray-900 dark:text-gray-200'
											}`
										}
										onClick={() => {
											if (!assignees) return;
											const isAssigned = assignees.current
												?.map((el) => el.id)
												.includes(member.employee.id);

											if (isAssigned) {
												assignees.current = (assignees.current || []).filter(
													(el) => el.id !== member.employee.id
												);
											} else {
												assignees.current = [
													...(assignees.current || []),
													{ id: member.employee.id }
												];
											}
										}}
										value={member}
									>
										{assignees?.current?.map((el) => el.id).includes(member.employee.id) && (
											<span className={`flex absolute inset-y-0 left-0 items-center pl-3`}>
												<CheckIcon className="w-5 h-5" aria-hidden="true" />
											</span>
										)}

										<span className="text-xs text-nowrap whitespace-nowrap">
											{member.employee.fullName}
										</span>
									</Combobox.Option>
								))}
						</Combobox.Options>
					</Transition>
				</div>
			</Combobox>
		</div>
	);
}
