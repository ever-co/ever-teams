'use client';
import { logErrorInDev } from '@/core/lib/helpers/error-message';

import { HostKeys, RTuseTaskInput, useCallbackRef, useHotkeys, useOutsideClick, useTaskInput } from '@/core/hooks';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useTaskSizesQuery } from '@/core/hooks/tasks/use-task-sizes-query';
import { useTaskPrioritiesQuery } from '@/core/hooks/tasks/use-task-priorities-query';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { timerStatusState } from '@/core/stores';
import {
	Button,
	SpinnerLoader,
	modalDescriptionFieldClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalPropertyPillClass,
	modalTitleFieldClass
} from '@/core/components';
import { RefObject, PropsWithChildren, ReactNode, useCallback, useEffect, useMemo, useRef, useState, JSX } from 'react';
import { useAtomValue } from 'jotai';
import { TaskIssuesDropdown } from './task-issue';
import { useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';
import { Nullable } from '@/core/types/generics/utils';
import { ETaskSizeName, ETaskPriority, EIssueType, ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { Select } from '../features/projects/add-or-edit-project/steps/basic-information-form';
import { cn } from '@/core/lib/helpers';
import { Check, FlagPriority, Plus as PlusIcon, Ruler, Tag } from '@/core/components/icons';
import { TTag } from '@/core/types/schemas/tag/tag.schema';
import { dataColorDotStyle, isPaintableColor } from './task-data-color';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';
import {
	VOICE_FILL_FIELD_TRANSITION,
	VOICE_FILLED_FIELD,
	VoiceFillPanel,
	VoiceFillTrigger,
	useVoiceFillErrorToast
} from '@/core/components/common/voice-fill/voice-fill-controls';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import {
	useTaskVoiceFill,
	type TaskCardVoiceTarget,
	type TaskCardVoiceValues
} from '@/core/hooks/tasks/use-task-voice-fill';

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

	const { viewType = 'input-trigger' } = props;

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
		setFilter
	} = datas;

	const inputTaskTitle = useMemo(() => inputTask?.title || '', [inputTask?.title]);

	const [taskName, setTaskName] = useState('');
	const titleInputRef = useRef<HTMLInputElement>(null);
	const [voiceIssueType, setVoiceIssueType] = useState<string | null>(null);
	const [issuePickerKey, setIssuePickerKey] = useState(0);
	const voiceIssueTypeRef = useSyncRef(voiceIssueType);
	const voiceCardRef = useRef<TaskCardVoiceTarget | null>(null);
	const showVoiceError = useVoiceFillErrorToast();

	const readTitle = useCallback(() => titleInputRef.current?.value ?? '', []);
	const writeTitle = useCallback((title: string) => {
		const input = titleInputRef.current;
		if (input) {
			input.value = title;
		}
		setTaskName(title);
	}, []);
	const readIssueType = useCallback(() => voiceIssueTypeRef.current, [voiceIssueTypeRef]);
	const writeIssueType = useCallback(
		(issueType: string | null) => {
			setVoiceIssueType(issueType);
			setTaskIssue(issueType ?? '');
			setIssuePickerKey((key) => key + 1);
		},
		[setTaskIssue]
	);
	const {
		voice,
		fieldLabels: voiceFieldLabels,
		hint: voiceHint
	} = useTaskVoiceFill(
		{ readTitle, writeTitle, readIssueType, writeIssueType, cardRef: voiceCardRef },
		showVoiceError
	);

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
				.then(() => {
					setTaskName('');

					props.onClose && props.onClose();
				})
				.catch((error) => {
					// useCreateTask already showed the error toast; the modal stays open for a retry. Logged so a
					// failure in the caller's onTaskCreated is not swallowed silently.
					logErrorInDev('[TaskInputKanban] task creation flow failed', error);
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

	const hasTask = Boolean(props.task);
	const isInputLoading = hasTask && Boolean(props.inputLoader);
	const showTitleSpinner = updateLoading || isInputLoading;
	const titlePlaceholder = props.placeholder || t('form.TASK_INPUT_PLACEHOLDER');

	const inputField = (
		<div className="flex flex-col gap-2">
			<div
				className={cn(
					'flex items-center gap-2',
					VOICE_FILL_FIELD_TRANSITION,
					voice.isHighlighted('title') && VOICE_FILLED_FIELD
				)}
			>
				<input
					ref={titleInputRef}
					type="text"
					disabled={timerRunningStatus}
					autoFocus={props.autoFocus}
					aria-label={titlePlaceholder}
					placeholder={titlePlaceholder}
					onFocus={(e) => {
						setEditMode(true);
						props.autoInputSelectText && setTimeout(() => e?.target?.select(), 10);
					}}
					onChange={(event) => {
						setTaskName(event.target.value);
					}}
					onKeyUp={(e) => {
						if (e.key === 'Enter' && inputTask) {
							!props.createOnEnterClick && updateTaskNameHandler(inputTask, taskName);

							props.onEnterKey && props.onEnterKey(taskName, inputTask);
						}
						if (e.key === 'Enter') {
							props.createOnEnterClick && handleTaskCreation();
						}
					}}
					className={cn(modalTitleFieldClass, 'disabled:cursor-not-allowed disabled:opacity-50')}
				/>
				{showTitleSpinner && <SpinnerLoader size={20} />}
				<VoiceFillTrigger voice={voice} disabled={timerRunningStatus} />
			</div>
			<VoiceFillPanel voice={voice} hint={voiceHint} fieldLabels={voiceFieldLabels} />
		</div>
	);

	const issueTypePicker = (
		<div
			className={cn(
				'flex items-center',
				VOICE_FILL_FIELD_TRANSITION,
				voice.isHighlighted('issueType') && VOICE_FILLED_FIELD
			)}
			ref={ignoreElementRef}
		>
			<TaskIssuesDropdown
				key={issuePickerKey}
				defaultValue={(voiceIssueType ?? undefined) as EIssueType | undefined}
				taskStatusClassName="!px-1 py-1 rounded-sm"
				showIssueLabels={false}
				onValueChange={(v: any) => {
					setTaskIssue(v);
					setVoiceIssueType(v);
				}}
			/>
		</div>
	);

	const taskCard = (
		<TaskCard
			datas={datas}
			inputField={viewType ? inputField : undefined}
			issueTypePicker={issueTypePicker}
			fullWidth={props.fullWidthCombobox}
			fullHeight={props.fullHeightCombobox}
			kanbanTitle={props.kanbanTitle ?? 'open'}
			handleTaskCreation={handleTaskCreation}
			cardWithoutShadow={props.cardWithoutShadow}
			updatedTaskList={updatedTaskList}
			voiceCardRef={voiceCardRef}
			isVoiceFilled={voice.isHighlighted}
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
	issueTypePicker,
	kanbanTitle,
	handleTaskCreation,
	voiceCardRef,
	isVoiceFilled
}: {
	datas: Partial<RTuseTaskInput>;
	inputField?: JSX.Element;
	issueTypePicker?: JSX.Element;
	kanbanTitle: string;
	fullWidth?: boolean;
	fullHeight?: boolean;
	handleTaskCreation: () => void;
	cardWithoutShadow?: boolean;
	updatedTaskList?: TTask[];
	voiceCardRef?: RefObject<TaskCardVoiceTarget | null>;
	isVoiceFilled?: (key: string) => boolean;
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

	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);
	const { loadTaskStatuses } = useTaskStatusesQuery();
	const { taskPriorities } = useTaskPrioritiesQuery();
	const { taskSizes } = useTaskSizesQuery();
	const { taskLabels } = useTaskLabelsQuery();
	const [taskPriority, setTaskPriority] = useState<ETaskPriority | undefined>(
		activeTaskPriority?.current as ETaskPriority | undefined
	);
	const [taskSize, setTaskSize] = useState<ETaskSizeName | undefined>(
		activeTaskSize?.current as ETaskSizeName | undefined
	);
	const [selectedTaskLabels, setSelectedTaskLabels] = useState(activeTaskLabels?.current.map((el) => el.name) ?? []);
	const [description, setDescription] = useState('');
	const mentions = useTeamMentionCandidates();

	/**
	 * Memoize select props to prevent unnecessary re-renders.
	 */

	const taskPrioritiesOptions = useMemo(() => {
		return taskPriorities.map((el) => ({
			id: el.value,
			value: el.name,
			name: el.name,
			color: el.color ?? undefined,
			fullIconUrl: el.fullIconUrl ?? undefined
		}));
	}, [taskPriorities]);

	const taskSizesOptions = useMemo(() => {
		return taskSizes.map((el) => ({
			id: el.value,
			value: el.name,
			name: el.name,
			color: el.color ?? undefined,
			fullIconUrl: el.fullIconUrl ?? undefined
		}));
	}, [taskSizes]);

	const taskLabelsOptions = useMemo(() => {
		return taskLabels.map((el) => ({
			id: el.name,
			value: el.name,
			name: el.name,
			color: el.color ?? undefined,
			fullIconUrl: el.fullIconUrl ?? undefined
		}));
	}, [taskLabels]);

	const handleTaskPriorityChange = useCallback((value: string) => {
		setTaskPriority(value as ETaskPriority);
		if (activeTaskPriority) {
			activeTaskPriority.current = value as ETaskPriority;
		}
	}, []);

	const handleTaskSizeChange = useCallback((value: string) => {
		setTaskSize(value as ETaskSizeName);
		if (activeTaskSize) {
			activeTaskSize.current = value as ETaskSizeName;
		}
	}, []);

	const handleTaskLabelsChange = useCallback(
		(value: string[]) => {
			setSelectedTaskLabels(value);
			if (activeTaskLabels) {
				activeTaskLabels.current = value.map((el) => taskLabels.find((item) => item.name === el) as TTag);
			}
		},
		[taskLabels, activeTaskLabels]
	);

	const labelSelectRenderItem = useCallback(
		(item: (typeof taskLabelsOptions)[number], isSelected: boolean) => (
			<PropertyMenuRow name={item.name} color={item.color} isSelected={isSelected} />
		),
		[]
	);

	const labelSelectRenderValue = useCallback(() => {
		const selectedCount = selectedTaskLabels.length;
		if (selectedCount) {
			return <span className="truncate">{t('modals.createTask.labelsSelected', { count: selectedCount })}</span>;
		}
		return (
			<span className="flex items-center gap-1.5 text-muted-foreground">
				<Tag aria-hidden="true" />
				{t('pages.taskDetails.LABELS')}
			</span>
		);
	}, [selectedTaskLabels, t]);

	const isCreateDisabled = isTaskCreationBlocked(datas, timerRunningStatus);

	const handleDescriptionChange = (html: string) => {
		setDescription(html);
		if (taskDescription) {
			taskDescription.current = html;
		}
	};

	const writeVoiceValues = (patch: Partial<TaskCardVoiceValues>) => {
		if ('descriptionHtml' in patch) {
			handleDescriptionChange(patch.descriptionHtml ?? '');
		}
		if ('priority' in patch) {
			handleTaskPriorityChange(patch.priority ?? '');
		}
		if ('size' in patch) {
			handleTaskSizeChange(patch.size ?? '');
		}
		if (patch.labels) {
			handleTaskLabelsChange(patch.labels);
		}
	};

	useEffect(() => {
		if (!voiceCardRef) {
			return;
		}
		voiceCardRef.current = {
			read: () => ({
				descriptionHtml: description,
				priority: taskPriority,
				size: taskSize,
				labels: selectedTaskLabels
			}),
			write: writeVoiceValues
		};
	});

	const voiceFieldClass = (key: string) =>
		cn(VOICE_FILL_FIELD_TRANSITION, isVoiceFilled?.(key) && VOICE_FILLED_FIELD);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				{inputField}
				{datas.hasCreateForm && (
					<div className={voiceFieldClass('description')}>
						<LazyRichEditor
							value={description}
							onChange={handleDescriptionChange}
							chrome="bare"
							toolbar={false}
							placeholder={t('richEditor.CREATE_PLACEHOLDER')}
							ai={{ context: 'task' }}
							mentions={mentions}
							aria-label={t('pages.taskDetails.DESCRIPTION')}
							contentClassName={cn(
								modalDescriptionFieldClass,
								'max-h-48 min-h-16 overflow-y-auto px-0 py-0'
							)}
						/>
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				{issueTypePicker}
				{datas.hasCreateForm && (
					<>
						<span className={voiceFieldClass('priority')}>
							<TaskPropertySelect
								placeholder={t('pages.taskDetails.PRIORITY')}
								emptyLabel={t('pages.taskDetails.PRIORITY')}
								emptyIcon={<FlagPriority aria-hidden="true" />}
								selected={taskPriority}
								onChange={handleTaskPriorityChange}
								options={taskPrioritiesOptions}
							/>
						</span>

						<span className={voiceFieldClass('size')}>
							<TaskPropertySelect
								placeholder={t('pages.taskDetails.SIZE')}
								emptyLabel={t('pages.taskDetails.SIZE')}
								emptyIcon={<Ruler aria-hidden="true" />}
								selected={taskSize}
								onChange={handleTaskSizeChange}
								options={taskSizesOptions}
							/>
						</span>

						<span className={voiceFieldClass('labels')}>
							<Select
								placeholder={t('pages.taskDetails.LABELS')}
								options={taskLabelsOptions}
								selected={selectedTaskLabels}
								onChange={handleTaskLabelsChange}
								multiple
								showChevronDownIcon={false}
								selectTriggerClassName={modalPropertyPillClass}
								selectOptionsListClassName="w-48"
								renderItem={labelSelectRenderItem}
								alignOptionsList="start"
								renderValue={labelSelectRenderValue}
							/>
						</span>
					</>
				)}
			</div>

			<div className={modalFooterClass}>
				<Tooltip
					enabled={!datas.user?.isEmailVerified}
					label={t('common.VERIFY_ACCOUNT_MSG')}
					placement="top-start"
					className="inline-block"
				>
					<Button
						size="default"
						disabled={isCreateDisabled}
						loading={datas.createLoading}
						className={modalPrimaryActionClass}
						onClick={() => {
							handleTaskCreation();
							setTimeout(() => {
								loadTaskStatuses();
							}, 4000);
						}}
					>
						{!datas.createLoading && <PlusIcon className="size-4" />}
						{t('common.CREATE_TASK')}
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}

function isTaskCreationBlocked(datas: Partial<RTuseTaskInput>, timerRunningStatus: boolean) {
	const hasNoCreateForm = !datas.hasCreateForm;
	const isCreating = Boolean(datas.createLoading);
	const isUnverified = !datas.user?.isEmailVerified;
	return hasNoCreateForm || isCreating || isUnverified || timerRunningStatus;
}

function PropertyColorDot({ color }: { color?: string }) {
	if (!isPaintableColor(color)) {
		return (
			<span aria-hidden="true" className="size-2 shrink-0 rounded-full hairline-border border-foreground/40" />
		);
	}
	return <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={dataColorDotStyle(color)} />;
}

function PropertyMenuRow({ name, color, isSelected }: { name: string; color?: string; isSelected: boolean }) {
	return (
		<span className="flex w-full items-center gap-2 text-[13px]">
			<PropertyColorDot color={color} />
			<span className="min-w-0 flex-1 truncate capitalize">{name}</span>
			{isSelected && <Check aria-hidden="true" className="size-4 text-foreground" />}
		</span>
	);
}

/**
 * Reusable single task property select component.
 */
interface TaskPropertySelectProps {
	placeholder: string;
	options: Array<{ id: string; value: string; name: string; color?: string; fullIconUrl?: string }>;
	selected: string | undefined;
	onChange: (value: string) => void;
	emptyLabel: string;
	emptyIcon?: ReactNode;
}

export function TaskPropertySelect({
	placeholder,
	options,
	selected,
	onChange,
	emptyLabel,
	emptyIcon
}: TaskPropertySelectProps) {
	const renderItem = useCallback(
		(item: (typeof options)[number], isSelected: boolean) => (
			<PropertyMenuRow name={item.name} color={item.color} isSelected={isSelected} />
		),
		[]
	);

	const renderValue = useCallback(
		(value: string | null) => {
			const item = options.find((el) => el.id === value);
			if (item) {
				return (
					<span className="flex min-w-0 items-center gap-1.5">
						<PropertyColorDot color={item.color} />
						<span className="truncate capitalize">{item.name}</span>
					</span>
				);
			}
			return (
				<span className="flex items-center gap-1.5 text-muted-foreground">
					{emptyIcon}
					{emptyLabel}
				</span>
			);
		},
		[options, emptyLabel, emptyIcon]
	);
	return (
		<Select
			placeholder={placeholder}
			options={options}
			selected={selected as string}
			onChange={onChange}
			showChevronDownIcon={false}
			selectTriggerClassName={modalPropertyPillClass}
			selectOptionsListClassName="w-48"
			renderItem={renderItem}
			alignOptionsList="start"
			renderValue={renderValue}
		/>
	);
}
