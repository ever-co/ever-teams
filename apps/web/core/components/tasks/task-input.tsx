'use client';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	HostKeys,
	RTuseTaskInput,
	useAuthenticateUser,
	useCallbackRef,
	useHotkeys,
	useOutsideClick,
	useTaskInput
} from '@/core/hooks';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useIssueTypesQuery } from '@/core/hooks/tasks/use-issue-types-query';
import { activeTeamState, activeTeamTaskId, timerStatusState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Combobox, Popover, PopoverPanel, Transition } from '@headlessui/react';
import {
	Check as CheckIcon,
	ChevronDown as ChevronDownIcon,
	Plus as PlusIcon,
	UsersGroup as UserGroupIcon
} from '@/core/components/icons';
import { Button, SpinnerLoader } from '@/core/components';
import { CircleIcon } from 'assets/svg';
import { JSX, RefObject, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { ActiveTaskIssuesDropdown, TaskIssuesDropdown } from './task-issue';
import { TaskItem } from './task-items';
import { TaskLabels } from './task-labels';
import { ActiveTaskPropertiesDropdown, ActiveTaskSizesDropdown, ActiveTaskStatusDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { DictationButton } from '@/core/components/common/dictation-button';
import { appendDictatedText } from '@/core/hooks/ai/use-dictation';
import { useInfinityScrolling } from '@/core/hooks/common/use-infinity-fetch';
import { LazyRender } from '@/core/components/common/lazy-render';
import { ProjectDropDown } from '@/core/components/pages/task/details-section/blocks/task-secondary-info';
import { toast } from 'sonner';
import { cn } from '@/core/lib/helpers';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { TASK_PROPERTY_PILL_RECIPE } from './task-property-trigger';
import { InputField } from '../duplicated-components/_input';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import { isInRichEditorLayer } from '@/core/components/common/rich-editor/editor-layer';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';
import { Tooltip } from '../duplicated-components/tooltip';
import { EverCard } from '../common/ever-card';
import { ObserverComponent } from './observer';
import { Nullable } from '@/core/types/generics/utils';
import { IIssueType } from '@/core/types/interfaces/task/issue-type';
import { EIssueType, ETaskStatusName, ETaskPriority, ETaskSize } from '@/core/types/generics/enums/task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

type Props = {
	task?: Nullable<TTask>;
	tasks?: TTask[];
	// False when `tasks` is a copy taken before every team task page was loaded.
	tasksComplete?: boolean;
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
	showEmoji?: boolean;
	autoAssignTaskAuth?: boolean;
	fullWidthCombobox?: boolean;
	fullHeightCombobox?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
	autoInputSelectText?: boolean;
	usersTaskCreatedAssignTo?: { id: string }[];
	onTaskCreated?: (task: TTask | undefined) => void;
	cardWithoutShadow?: boolean;
	assignTaskPopup?: boolean;
	forParentChildRelationship?: boolean;
} & PropsWithChildren;

function issueTileClassName(task: { issueType?: string | null } | null | undefined) {
	const isBug = task?.issueType === 'Bug';
	if (isBug) {
		return '!px-[0.3312rem] py-[0.2875rem] rounded-sm';
	}
	return '!px-[0.375rem] py-[0.375rem] rounded-sm';
}

/**
 * If task passed then some function should not considered as global state
 *
 * @param param0
 * @returns
 */

export function TaskInput(props: Props) {
	const t = useTranslations();

	const { issueTypes } = useIssueTypesQuery();
	const defaultIssueType: IIssueType | undefined = issueTypes.find((issue) => issue.isDefault);

	const { viewType = 'input-trigger', showTaskNumber = false, showCombobox = true } = props;

	const datas = useTaskInput({
		task: props.task,
		initEditMode: props.initEditMode,
		tasks: props.tasks,
		tasksComplete: props.tasksComplete
	});

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
		(task: TTask | undefined) => $onTaskCreated.current && $onTaskCreated.current(task as any),
		[$onTaskCreated]
	);

	const onTaskClick = useCallback(
		(task: TTask) => $onTaskClick.current && $onTaskClick.current(task),
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

	const closeOnOutsideClick = (_card: HTMLElement, target: HTMLElement) => {
		const isKeptOpen = Boolean(props.keepOpen);
		const isCreating = Boolean(datas.isCreatingTask);
		const isInEditorMenu = isInRichEditorLayer(target);
		const staysOpen = isKeptOpen || isCreating || isInEditorMenu;
		if (!staysOpen) {
			setEditMode(false);
		}
	};
	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLInputElement>(closeOnOutsideClick);

	useEffect(() => {
		setQuery(taskName === inputTask?.title ? '' : taskName);
	}, [taskName, inputTask, setQuery, datas.isCreatingTask]);

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
		(task: TTask) => {
			if (datas.setActiveTask) {
				// NOTE_FIX: datas.setActiveTask already calls updateOrganizationTeamEmployeeActiveTask
				// which has optimistic updates for React Query. No need to call updateOrganizationTeamEmployee
				// here as it would be redundant and would overwrite the optimistic update.
				datas.setActiveTask(task);
			}
			setEditMode(false);
		},
		[datas, setEditMode]
	);

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
	after task creation.
	The dashboard input passes task={activeTeamTask}, which is null (not undefined) when the user has
	no active task yet — treat that the same as "no task": a task created from an empty "What you
	working on?" must become the active task, otherwise the play button silently does nothing.
   */
	const autoActiveTask: boolean = props.task === undefined || props.task === null;
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
				?.then((createdTask) => {
					if (createdTask) {
						toast.success(t('toasts.tasks.CREATED'), { description: createdTask.title });
					}
					onTaskCreated(createdTask);
					viewType === 'one-view' && setTaskName('');
				})
				.catch((error) => {
					// useCreateTask already showed the error toast; the typed title stays for a retry. Logged so a
					// failure in the caller's onTaskCreated is not swallowed silently.
					logErrorInDev('[TaskInput] task creation flow failed', error);
				});
	}, [datas, props, autoActiveTask, onTaskCreated, viewType, t]);

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
	}, [props.forParentChildRelationship, props.task?.issueType, props.task?.children, datas.filteredTasks]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (inputRef.current && !inputRef.current.contains(event.target as Node) && editMode) {
				// Check if the click is on a dropdown element to avoid closing during dropdown interactions
				const target = event.target as Element;
				const isDropdownClick =
					target.closest('[data-radix-popper-content-wrapper]') ||
					target.closest('[role="listbox"]') ||
					target.closest('[role="menu"]') ||
					target.closest('[data-headlessui-state]') ||
					target.closest('.dropdown-content') ||
					target.closest('[data-dropdown]');

				// Only close if it's not a dropdown interaction and we're not creating a new task
				if (!isDropdownClick && !datas.isCreatingTask && taskName == inputTaskTitle) {
					setEditMode(false);
					// setActiveTask({
					// 	id: ''
					// });
				}
			}
		};

		// Attach the event listener
		document.addEventListener('mousedown', handleClickOutside);

		// Clean up the event listener on component unmount
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [
		inputTask,
		taskName,
		setActiveTask,
		updateTaskNameHandler,
		editMode,
		inputTaskTitle,
		setEditMode,
		datas.isCreatingTask
	]);
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

	const appendDictation = (text: string) => {
		setTaskName((current) => appendDictatedText(current, text));
		targetEl.current?.focus();
	};

	const inputField = (
		<InputField
			value={taskName}
			disabled={timerRunningStatus}
			ref={targetEl}
			emojis={props.showEmoji === undefined || props.showCombobox ? true : false}
			setTaskName={setTaskName}
			ignoreElementRefForTitle={ignoreElementRef as unknown as RefObject<HTMLDivElement>}
			autoFocus={props.autoFocus}
			wrapperClassName={CALM_FIELD}
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
				<div className="flex justify-center items-center p-2 h-full">
					{props.task ? (
						(updateLoading || props.inputLoader) && <SpinnerLoader size={25} />
					) : (
						<>{updateLoading && <SpinnerLoader size={25} />}</>
					)}
					<DictationButton onText={appendDictation} disabled={timerRunningStatus} />
				</div>
			}
			className={clsxm(showTaskNumber && inputTask && ['pl-2'], props.initEditMode && 'h-10')}
			/* Showing the task number and issue type */
			leadingNode={
				// showTaskNumber &&
				// inputTask &&
				<div className="flex gap-x-2 items-center pl-3 xl:pl-1" ref={ignoreElementRef}>
					{!datas.hasCreateForm ? (
						<ActiveTaskIssuesDropdown
							key={(inputTask && inputTask.id) || ''}
							task={inputTask}
							forParentChildRelationship
							taskStatusClassName={clsxm(issueTileClassName(inputTask), 'border-none')}
							className="p-1.5!"
						/>
					) : (
						<TaskIssuesDropdown
							onValueChange={(v: any) => setTaskIssue(v)}
							defaultValue={
								defaultIssueType
									? defaultIssueType.name
									: (localStorage.getItem('lastTaskIssue') as EIssueType) || null
							}
						/>
					)}

					{!datas.hasCreateForm && (
						<span className="text-sm tabular-nums text-muted-foreground">
							#{inputTask?.taskNumber || ''}
						</span>
					)}
				</div>
			}
		/>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			onItemClick={props.onTaskClick ? onTaskClick : setAuthActiveTask}
			inputField={viewType === 'one-view' ? inputField : undefined}
			fullWidth={props.fullWidthCombobox}
			fullHeight={props.fullHeightCombobox}
			handleTaskCreation={handleTaskCreation}
			cardWithoutShadow={props.cardWithoutShadow}
			assignTaskPopup={props.assignTaskPopup}
			updatedTaskList={updatedTaskList}
			forParentChildRelationship={props.forParentChildRelationship}
			ignoreElementRef={ignoreElementRef}
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
				<PopoverPanel
					className={clsxm('absolute -mt-3', props.fullWidthCombobox && ['w-full left-0 right-0'])}
					ref={ignoreElementRef}
				>
					{taskCard}
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}

/**
 * A component that is used to render the task list.
 */
type TaskListFilter = 'open' | 'closed';

/**
 * The title and description fields of the task block stay calm on focus, like Linear's and Plane's title fields:
 * the hairline darkens, no halo around the field.
 */
const CALM_FIELD =
	'rounded-lg [&>div]:focus-within:hairline-ring [&>div]:focus-within:ring-foreground/25 dark:[&>div]:focus-within:ring-foreground/30';

/** A task option of the picker: a compact menu row, the current task tinted. */
const TASK_OPTION_ROW = 'cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.04]';
const TASK_OPTION_ROW_ACTIVE = 'bg-foreground/[0.04]';

function taskListHeightOf(assignTaskPopup: boolean | undefined) {
	if (assignTaskPopup) {
		return 'max-h-[40vh]';
	}
	return 'max-h-80';
}

/** A count is shown once every page of tasks has loaded; before that it would undercount. */
function loadedCountOf(isComplete: boolean | undefined, count: number | undefined) {
	if (!isComplete) {
		return undefined;
	}
	return count ?? 0;
}

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
	assignTaskPopup,
	ignoreElementRef
}: {
	datas: Partial<RTuseTaskInput>;
	onItemClick?: (task: TTask) => void;
	inputField?: JSX.Element;
	fullWidth?: boolean;
	fullHeight?: boolean;
	handleTaskCreation: () => void;
	cardWithoutShadow?: boolean;
	forParentChildRelationship?: boolean;
	updatedTaskList?: TTask[];
	assignTaskPopup?: boolean;
	ignoreElementRef?: (el: any) => void;
}) {
	const t = useTranslations();
	const activeTaskEl = useRef<HTMLLIElement | null>(null);
	const { taskLabels: taskLabelsData } = useTaskLabelsQuery();

	const activeTeam = useAtomValue(activeTeamState);

	// Refs for dropdown elements to exclude from outside click detection
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const priorityDropdownRef = useRef<HTMLDivElement>(null);
	const sizeDropdownRef = useRef<HTMLDivElement>(null);
	const labelsDropdownRef = useRef<HTMLDivElement>(null);
	const assigneesDropdownRef = useRef<HTMLDivElement>(null);
	const projectDropdownRef = useRef<HTMLDivElement>(null);

	const { taskStatus, taskPriority, taskSize, taskLabels, taskDescription, taskProject, taskAssignees } = datas;
	const mentions = useTeamMentionCandidates();
	const { nextOffset, data } = useInfinityScrolling(updatedTaskList ?? [], 5);

	// Register dropdown refs with useOutsideClick to ignore them
	useEffect(() => {
		if (ignoreElementRef) {
			if (statusDropdownRef.current) ignoreElementRef(statusDropdownRef.current);
			if (priorityDropdownRef.current) ignoreElementRef(priorityDropdownRef.current);
			if (sizeDropdownRef.current) ignoreElementRef(sizeDropdownRef.current);
			if (labelsDropdownRef.current) ignoreElementRef(labelsDropdownRef.current);
			if (assigneesDropdownRef.current) ignoreElementRef(assigneesDropdownRef.current);
			if (projectDropdownRef.current) ignoreElementRef(projectDropdownRef.current);
		}
	}, [
		ignoreElementRef,
		statusDropdownRef,
		priorityDropdownRef,
		sizeDropdownRef,
		labelsDropdownRef,
		assigneesDropdownRef,
		projectDropdownRef
	]);

	// Optimized callbacks to prevent unnecessary re-renders and state resets
	const handleStatusChange = useCallback(
		(v: any) => {
			if (v && taskStatus) {
				taskStatus.current = v;
			}
		},
		[taskStatus]
	);

	const handlePriorityChange = useCallback(
		(v: any) => {
			if (v && taskPriority) {
				taskPriority.current = v;
			}
		},
		[taskPriority]
	);

	const handleSizeChange = useCallback(
		(v: any) => {
			if (v && taskSize) {
				taskSize.current = v;
			}
		},
		[taskSize]
	);

	const handleLabelsChange = useCallback(
		(_: any, values: string[] | undefined) => {
			if (taskLabels && values?.length) {
				taskLabels.current = taskLabelsData.filter((tag) => (tag.name ? values?.includes(tag.name) : false));
			}
		},
		[taskLabels, taskLabelsData]
	);

	const handleProjectChange = useCallback(
		(project: any) => {
			if (taskProject) {
				taskProject.current = project.id;
			}
		},
		[taskProject]
	);

	const handleDescriptionChange = useCallback(
		(html: string) => {
			if (taskDescription) {
				taskDescription.current = html;
			}
		},
		[taskDescription]
	);

	const taskFilterItems: SegmentedControlItem<TaskListFilter>[] = [
		{ value: 'open', label: t('common.OPEN'), count: loadedCountOf(datas.tasksComplete, datas.openTaskCount) },
		{ value: 'closed', label: t('common.CLOSED'), count: loadedCountOf(datas.tasksComplete, datas.closedTaskCount) }
	];
	const selectTaskFilter = (filter: TaskListFilter) => {
		datas.setFilter?.(filter);
	};

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
			<EverCard
				shadow="custom"
				className={clsxm(
					'overflow-hidden rounded-xl p-0 md:p-0',
					!cardWithoutShadow && 'shadow-md shadow-black/6.5',
					fullWidth ? ['w-full'] : ['md:w-[500px]'],
					fullHeight && 'h-full'
				)}
			>
				<div className="flex flex-col gap-3 p-3">
					<>
						{inputField}
						{datas.hasCreateForm && (
							<div className="flex flex-col gap-2">
								<div className="rounded-lg bg-background px-3 py-2 hairline-ring ring-border transition-shadow focus-within:ring-foreground/25 dark:focus-within:ring-foreground/30">
									<LazyRichEditor
										value={taskDescription?.current ?? ''}
										onChange={handleDescriptionChange}
										chrome="bare"
										toolbar={false}
										placeholder={t('richEditor.CREATE_PLACEHOLDER')}
										ai={{ context: 'task' }}
										mentions={mentions}
										aria-label={t('pages.taskDetails.DESCRIPTION')}
										contentClassName="max-h-40 min-h-10 overflow-y-auto text-[13px]"
									/>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<div ref={statusDropdownRef}>
										<ActiveTaskStatusDropdown
											className="min-w-fit lg:max-w-[170px]"
											taskStatusClassName="h-7 text-xs"
											onValueChange={handleStatusChange}
											defaultValue={taskStatus?.current as ETaskStatusName}
											task={null}
										/>
									</div>

									<div ref={priorityDropdownRef}>
										<ActiveTaskPropertiesDropdown
											className="min-w-fit lg:max-w-[170px]"
											taskStatusClassName="h-7 text-xs"
											onValueChange={handlePriorityChange}
											defaultValue={taskPriority?.current as ETaskPriority}
											task={null}
										/>
									</div>

									<div ref={sizeDropdownRef}>
										<ActiveTaskSizesDropdown
											className="min-w-fit lg:max-w-[170px]"
											taskStatusClassName="h-7 text-xs"
											onValueChange={handleSizeChange}
											defaultValue={taskSize?.current as ETaskSize}
											task={null}
										/>
									</div>

									<div ref={labelsDropdownRef}>
										<TaskLabels
											className="min-w-fit lg:max-w-[170px] text-xs z-[1000]"
											forDetails={true}
											taskStatusClassName="h-7"
											onValueChange={handleLabelsChange}
											task={null}
										/>
									</div>

									{taskAssignees !== undefined && (
										<div ref={assigneesDropdownRef}>
											<AssigneesSelect
												key={`assignees-${datas.inputTask?.id || 'new'}`}
												className="min-w-fit"
												assignees={taskAssignees}
												teamMembers={activeTeam?.members ?? []}
											/>
										</div>
									)}

									<div ref={projectDropdownRef}>
										<ProjectDropDown
											controlled={true}
											styles={{
												container: 'rounded-xl min-w-fit max-w-[10.625rem]',
												listCard: 'rounded-xl'
											}}
											onChange={handleProjectChange}
										/>
									</div>
								</div>
							</div>
						)}

						<div className="flex flex-wrap items-center justify-between gap-2">
							<SegmentedControl
								items={taskFilterItems}
								value={datas.filter ?? 'open'}
								onValueChange={selectTaskFilter}
								ariaLabel={t('common.FILTER')}
							/>
							<Tooltip
								enabled={!datas.user?.isEmailVerified}
								label={t('common.VERIFY_ACCOUNT_MSG')}
								placement="top-start"
								className="inline-block"
							>
								<Button
									variant="outline"
									size="sm"
									disabled={
										!datas.hasCreateForm || datas.createLoading || !datas.user?.isEmailVerified
									}
									loading={datas.createLoading}
									onClick={handleTaskCreation}
								>
									{!datas.createLoading && <PlusIcon className="size-4" />}
									{t('common.CREATE_TASK')}
								</Button>
							</Tooltip>
						</div>
					</>
				</div>

				<ul className={cn('hairline-t border-border overflow-y-auto p-1', taskListHeightOf(assignTaskPopup))}>
					{forParentChildRelationship && (
						<LazyRender items={data || []}>
							{(task, i) => {
								const active = datas.inputTask === task;

								return (
									<li key={task.id} ref={active ? activeTaskEl : undefined}>
										<TaskItem
											task={task}
											selected={active}
											onClick={onItemClick}
											className={cn(TASK_OPTION_ROW, active && TASK_OPTION_ROW_ACTIVE)}
										/>
										<ObserverComponent isLast={i === data.length - 1} getNextData={nextOffset} />
									</li>
								);
							}}
						</LazyRender>
					)}

					{!forParentChildRelationship && (
						<LazyRender items={datas.filteredTasks || []}>
							{(task) => {
								const active = datas.inputTask === task;

								return (
									<li key={task.id} ref={active ? activeTaskEl : undefined}>
										<TaskItem
											task={task}
											selected={active}
											onClick={onItemClick}
											className={cn(TASK_OPTION_ROW, active && TASK_OPTION_ROW_ACTIVE)}
										/>
									</li>
								);
							}}
						</LazyRender>
					)}

					{(forParentChildRelationship && updatedTaskList && updatedTaskList.length === 0) ||
						(!forParentChildRelationship && datas.filteredTasks && datas.filteredTasks.length === 0 && (
							<div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
								{t('common.NO_TASKS')}
							</div>
						))}
				</ul>
			</EverCard>

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
	teamMembers: TOrganizationTeamEmployee[];
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
		() => teamMembers.find((member) => member.employee?.user?.id == user?.id),
		[teamMembers, user?.id]
	);

	// Auto-select current user by default if no assignees are selected
	useEffect(() => {
		if (assignees && authMember && (!assignees.current || assignees.current.length === 0)) {
			assignees.current = [{ id: authMember.employee?.id || '' }];
		}
	}, [assignees, authMember]);

	// Helper function to check if current user is assigned
	const isCurrentUserAssigned = useMemo(() => {
		return assignees?.current?.some((assignee) => assignee.id === authMember?.employee?.id);
	}, [assignees?.current, authMember?.employee?.id]);

	// Helper function to get other assigned users (excluding current user)
	const otherAssignedUsers = useMemo(() => {
		return assignees?.current?.filter((assignee) => assignee.id !== authMember?.employee?.id) || [];
	}, [assignees?.current, authMember?.employee?.id]);

	// Helper function to determine if current user can be deselected
	const canDeselectCurrentUser = useMemo(() => {
		return otherAssignedUsers.length > 0;
	}, [otherAssignedUsers.length]);

	return (
		<div
			className={cn(
				TASK_PROPERTY_PILL_RECIPE,
				'max-w-52 cursor-pointer transition-colors hover:bg-foreground/[0.03]',
				props.className
			)}
		>
			<Combobox multiple={true}>
				<div className="relative my-auto h-full">
					<div className="overflow-hidden w-full h-full text-left rounded-lg cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm">
						<Combobox.Button className="flex gap-1.5 justify-between items-center h-full min-w-fit max-w-40">
							<div
								className={cn(
									'flex gap-1 items-center text-foreground text-xs',
									!assignees?.current?.length && '!text-muted-foreground'
								)}
							>
								{!assignees?.current?.length ? (
									<CircleIcon className="w-4 h-4" />
								) : (
									<UserGroupIcon className="w-4 h-4" />
								)}
								{t('common.ASSIGNEE')}
							</div>
							<ChevronDownIcon className="size-4 text-muted-foreground" />
						</Combobox.Button>
					</div>
					<Transition
						as="div"
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Combobox.Options className="absolute mt-1 max-h-40 h-auto overflow-auto rounded-xl bg-popover p-1 text-sm text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none">
							{authMember && (
								<Combobox.Option
									className={({ active }) =>
										cn(
											'relative select-none rounded-md py-1.5 pl-9 pr-3 text-foreground transition-colors',
											canDeselectCurrentUser && 'cursor-pointer',
											!canDeselectCurrentUser && 'cursor-not-allowed opacity-75',
											active && 'bg-foreground/5'
										)
									}
									onClick={() => {
										if (!assignees) return;

										if (isCurrentUserAssigned) {
											// Only allow deselection if other users are assigned
											if (canDeselectCurrentUser) {
												assignees.current = (assignees.current || []).filter(
													(el) => el.id !== authMember.employee?.id
												);
											}
											// If can't deselect, do nothing (user remains selected)
										} else {
											// Re-select current user
											assignees.current = [
												...(assignees.current || []),
												{ id: authMember.employee?.id || '' }
											];
										}
									}}
									value={authMember}
								>
									{isCurrentUserAssigned && (
										<span className={`flex absolute inset-y-0 left-0 items-center pl-2.5`}>
											<CheckIcon className="size-4" aria-hidden="true" />
										</span>
									)}
									<span className="text-xs whitespace-nowrap text-nowrap">
										{authMember.employee?.fullName}
										{!canDeselectCurrentUser && isCurrentUserAssigned && (
											<span className="ml-1 text-xs text-muted-foreground">(Required)</span>
										)}
									</span>
								</Combobox.Option>
							)}

							{teamMembers
								.filter((member) => member.employee?.user?.id != user?.id)
								.map((member) => (
									<Combobox.Option
										key={member.id}
										className={({ active }) =>
											cn(
												'relative cursor-pointer select-none rounded-md py-1.5 pl-9 pr-3 text-foreground transition-colors',
												active && 'bg-foreground/5'
											)
										}
										onClick={() => {
											if (!assignees) return;
											const isAssigned = assignees.current
												?.map((el) => el.id)
												.includes(member.employee?.id || '');

											if (isAssigned) {
												assignees.current = (assignees.current || []).filter(
													(el) => el.id !== member.employee?.id
												);
											} else {
												assignees.current = [
													...(assignees.current || []),
													{ id: member.employee?.id || '' }
												];
											}
										}}
										value={member}
									>
										{assignees?.current?.map((el) => el.id).includes(member.employee?.id || '') && (
											<span className={`flex absolute inset-y-0 left-0 items-center pl-2.5`}>
												<CheckIcon className="size-4" aria-hidden="true" />
											</span>
										)}

										<span className="text-xs whitespace-nowrap text-nowrap">
											{member.employee?.fullName}
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
