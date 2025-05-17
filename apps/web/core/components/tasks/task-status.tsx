/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import {
	IClassName,
	ITaskStatusField,
	ITaskStatusItemList,
	ITaskStatusStack,
	ITeamTask,
	Nullable,
	Tag,
	TaskStatusEnum
} from '@/core/types/interfaces';
import { Queue } from '@/core/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import React, { PropsWithChildren, RefObject, useMemo } from 'react';
import {
	useStatusValue,
	useSyncRef,
	useTaskLabels,
	useTaskPriorities,
	useTaskSizes,
	useTaskStatus,
	useTaskStatusValue,
	useTaskVersion,
	useTeamTasks
} from '@/core/hooks';
import Image from 'next/legacy/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { readableColor } from 'polished';
import { useTheme } from 'next-themes';
import { Square4OutlineIcon, CircleIcon } from 'assets/svg';
import { getTextColor } from '@/core/lib/helpers/index';
import { Tooltip } from '../duplicated-components/tooltip';
import { CustomListboxDropdown } from './custom-dropdown';
import { capitalize } from 'lodash';
import { cn } from '@/core/lib/helpers';

export type TStatusItem = {
	id?: string;
	bgColor?: string;
	icon?: React.ReactNode | undefined;
	realName?: string;
	name?: string;
	value?: string;
	bordered?: boolean;
	showIcon?: boolean;
	className?: string;
};

export type TStatus<T extends string> = {
	[k in T]: TStatusItem;
};

export type TTaskStatusesDropdown<T extends ITaskStatusField> = IClassName &
	PropsWithChildren<{
		defaultValue?: ITaskStatusStack[T];
		onValueChange?: (v: ITaskStatusStack[T], values?: ITaskStatusStack[T][]) => void;
		forDetails?: boolean;
		dynamicValues?: any[];
		multiple?: boolean;
		disabled?: boolean;
		largerWidth?: boolean;
		sidebarUI?: boolean;
		placeholder?: string;
		defaultValues?: ITaskStatusStack[T][];
		taskStatusClassName?: string;
		latestLabels?: RefObject<string[]>;
		dropdownContentClassName?: string;
	}>;

export type TTaskVersionsDropdown<T extends ITaskStatusField> = IClassName & {
	defaultValue?: ITaskStatusStack[T];
	onValueChange?: (v: ITaskStatusStack[T]) => void;
};

export type IActiveTaskStatuses<T extends ITaskStatusField> = TTaskStatusesDropdown<T> & {
	onChangeLoading?: (loading: boolean) => void;
} & {
	task?: Nullable<ITeamTask>;
	showIssueLabels?: boolean;
	forDetails?: boolean;
	sidebarUI?: boolean;

	forParentChildRelationship?: boolean;
	taskStatusClassName?: string;
	showIcon?: boolean;
};

export function useMapToTaskStatusValues<T extends ITaskStatusItemList>(data: T[], bordered = false): TStatus<any> {
	return useMemo(() => {
		return data.reduce((acc, item) => {
			const value: TStatus<any>[string] = {
				id: item.id,
				name: item.name?.split('-').join(' '),
				realName: item.name?.split('-').join(' '),
				value: item.value || item.name,
				bgColor: item.color,
				bordered,
				icon: (
					<div className="relative flex items-center">
						{item.fullIconUrl && (
							<Image layout="fixed" src={item.fullIconUrl} height="20" width="16" alt={item.name} />
						)}
					</div>
				)
			};

			if (value.value) {
				acc[value.value] = value;
			} else if (value.name) {
				acc[value.name] = value;
			}
			return acc;
		}, {} as TStatus<any>);
	}, [data, bordered]);
}

export const taskUpdateQueue = new Queue(1);

export function useActiveTaskStatus<T extends ITaskStatusField>(
	props: IActiveTaskStatuses<T>,
	status: TStatus<ITaskStatusStack[T]>,
	field: T
) {
	const { activeTeamTask, handleStatusUpdate } = useTeamTasks();
	const { taskLabels } = useTaskLabels();
	const { taskStatuses } = useTaskStatus();

	const task = props.task !== undefined ? props.task : activeTeamTask;
	const $task = useSyncRef(task);

	/**
	 * "When the user changes the status of a task, update the status of the task and then call the
	 * onChangeLoading function with true, and when the status update is complete, call the onChangeLoading
	 * function with false."
	 *
	 * The first line of the function is a type annotation. It says that the function takes a single
	 * argument, which is an object of type ITaskStatusStack[T]. The type annotation is optional, but it's
	 * a good idea to include it
	 * @param status - The new status of the item.
	 */
	function onItemChange(status: ITaskStatusStack[T]) {
		props.onChangeLoading && props.onChangeLoading(true);

		let updatedField: ITaskStatusField = field;
		let taskStatusId: string | undefined;

		if (field === 'label' && task) {
			const currentTag = taskLabels.find((label) => label.name === status) as Tag;
			updatedField = 'tags';
			status = [currentTag];
		}

		if (field === 'status') {
			const selectedStatus = taskStatuses.find((s) => s.name === status && s.value === status);
			taskStatusId = selectedStatus?.id;
		}

		taskUpdateQueue.task((task) => {
			return handleStatusUpdate(status, updatedField || field, taskStatusId, task.current, true).finally(() => {
				props.onChangeLoading && props.onChangeLoading(false);
			});
		}, $task);
	}

	const { item, items, onChange } = useStatusValue<T>({
		status: status,
		value: props.defaultValue ? props.defaultValue : task ? task[field] : undefined,
		onValueChange: onItemChange,
		defaultValues: props.defaultValues
	});

	return {
		item,
		items,
		onChange,
		task,
		field
	};
}

/**
 * Task status dropwdown
 */
export function TaskStatusDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	sidebarUI = false,
	children,
	largerWidth
}: TTaskStatusesDropdown<'status'>) {
	const taskStatusValues = useTaskStatusValue();

	const { item, items, onChange, values } = useStatusValue<'status'>({
		status: taskStatusValues,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			showIcon={false}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'status' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			largerWidth={largerWidth}
		>
			{children}
		</StatusDropdown>
	);
}

export function StandardTaskStatusDropDown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	sidebarUI = false,
	children,
	largerWidth
}: TTaskStatusesDropdown<'status type'>) {
	const taskStatusValues = useTaskStatusValue();

	const { item, items, onChange, values } = useStatusValue<'status type'>({
		status: taskStatusValues,
		value: defaultValue,
		onValueChange,
		multiple
	});

	const standardStatuses = useMemo(
		() => items.filter((status) => Object.values(TaskStatusEnum).includes(status.value as TaskStatusEnum)),
		[items]
	);
	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			showIcon={false}
			forDetails={forDetails}
			className={className}
			items={standardStatuses}
			value={item}
			defaultItem={!item ? 'status type' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			largerWidth={largerWidth}
			bordered={false}
		>
			{children}
		</StatusDropdown>
	);
}

/**
 * If no task hasn't been passed then the auth active task will used
 *
 * @param props
 * @returns
 */
export function ActiveTaskStatusDropdown(props: IActiveTaskStatuses<'status'>) {
	const taskStatusValues = useTaskStatusValue();

	const { item, items, onChange, field } = useActiveTaskStatus(props, taskStatusValues, 'status');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={props.onValueChange ? props.onValueChange : onChange}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			taskStatusClassName={props.taskStatusClassName}
			showIcon={props.showIcon}
		>
			{props.children}
		</StatusDropdown>
	);
}

export function useTaskVersionsValue() {
	const { taskVersion } = useTaskVersion();

	return useMapToTaskStatusValues(taskVersion, false);
}

/**
 * Version dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the version properties
 */
export function VersionPropertiesDropown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	sidebarUI = false,
	children
}: TTaskStatusesDropdown<'version'>) {
	const taskVersionsValue = useTaskVersionsValue();

	const { item, items, onChange, values } = useStatusValue<'version'>({
		status: taskVersionsValue,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'version' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			showButtonOnly
			showIcon={false}
			bordered={true}
		>
			{children}
		</StatusDropdown>
	);
}

export function ActiveTaskVersionDropdown(props: IActiveTaskStatuses<'version'>) {
	const taskVersionValues = useTaskVersionsValue();

	const { item, items, onChange, field } = useActiveTaskStatus(props, taskVersionValues, 'version');

	// Manually removing color to show it properly
	// As in version it will be always white color
	items.forEach((it) => {
		it.bgColor = 'transparent';
	});

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			isVersion
			taskStatusClassName={props.taskStatusClassName}
		>
			{props.children}
		</StatusDropdown>
	);
}

//! =============== Task Epic ================= //

/**
 * Epic dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the version properties
 */
export function EpicPropertiesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	sidebarUI = false,
	children,
	taskStatusClassName
}: TTaskStatusesDropdown<'epic'>) {
	const { tasks } = useTeamTasks();
	const status = useMemo(() => {
		const temp: any = {};
		tasks.forEach((task) => {
			if (task.issueType === 'Epic') {
				temp[`#${task.taskNumber} ${task.title}`] = {
					id: task.id,
					name: `#${task.taskNumber} ${task.title}`,
					value: task.id,
					icon: (
						<div className="bg-[#8154BA] p-1 rounded-sm mr-1">
							<Square4OutlineIcon className="w-full mn-w-2 min-h-2 aspect-square max-w-[10px] text-white" />
						</div>
					)
				};
			}
		});
		return temp;
	}, [tasks]);
	const { item, items, onChange, values } = useStatusValue<'epic'>({
		status,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'epic' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			showButtonOnly
			taskStatusClassName={taskStatusClassName}
			isEpic
		>
			{children}
		</StatusDropdown>
	);
}

//! =============== Task Status ================= //

export function useTaskPrioritiesValue() {
	const { taskPriorities } = useTaskPriorities();
	return useMapToTaskStatusValues(taskPriorities, false);
}

/**
 * Task dropdown that allows you to select a task property
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A dropdown with the task properties
 */
export function TaskPropertiesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	largerWidth,
	sidebarUI = false,
	children
}: TTaskStatusesDropdown<'priority'>) {
	const taskPrioritiesValues = useTaskPrioritiesValue();

	const { item, items, onChange, values } = useStatusValue<'priority'>({
		status: taskPrioritiesValues,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'priority' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			largerWidth={largerWidth}
		>
			{children}
		</StatusDropdown>
	);
}

export function ActiveTaskPropertiesDropdown(props: IActiveTaskStatuses<'priority'>) {
	const taskPrioritiesValues = useTaskPrioritiesValue();

	const { item, items, onChange, field } = useActiveTaskStatus(props, taskPrioritiesValues, 'priority');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={props.onValueChange ? props.onValueChange : onChange}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			taskStatusClassName={props.taskStatusClassName}
		>
			{props.children}
		</StatusDropdown>
	);
}

export function TaskPriorityStatus({
	task,
	className,
	showIssueLabels
}: { task: Nullable<ITeamTask>; showIssueLabels?: boolean } & IClassName) {
	const taskPrioritiesValues = useTaskPrioritiesValue();

	return task?.priority ? (
		<TaskStatus
			{...taskPrioritiesValues[task?.priority]}
			showIssueLabels={showIssueLabels}
			issueType="issue"
			className={cn('px-2 text-white rounded-md', className)}
			bordered={false}
		/>
	) : (
		<></>
	);
}

//! =============== Task Sizes ================= //

export function useTaskSizesValue() {
	const { taskSizes } = useTaskSizes();
	return useMapToTaskStatusValues(taskSizes, false);
}

/**
 * Task dropdown that lets you select a task size
 * @param {IClassName}  - IClassName - This is the interface that the component will accept.
 * @returns A React component
 */
export function TaskSizesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	largerWidth,
	sidebarUI = false,
	children
}: TTaskStatusesDropdown<'size'>) {
	const taskSizesValue = useTaskSizesValue();

	const { item, items, onChange, values } = useStatusValue<'size'>({
		status: taskSizesValue,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'size' : undefined}
			onChange={onChange}
			multiple={multiple}
			values={values}
			largerWidth={largerWidth}
		>
			{children}
		</StatusDropdown>
	);
}

export function ActiveTaskSizesDropdown(props: IActiveTaskStatuses<'size'>) {
	const taskSizesValue = useTaskSizesValue();
	const { item, items, onChange, field } = useActiveTaskStatus(props, taskSizesValue, 'size');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={props.onValueChange ? props.onValueChange : onChange}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			taskStatusClassName={props.taskStatusClassName}
		>
			{props.children}
		</StatusDropdown>
	);
}

//! =============== Task Label ================= //

export function useTaskLabelsValue() {
	const { taskLabels } = useTaskLabels();
	return useMapToTaskStatusValues(taskLabels, false);
}

export function TaskLabelsDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	sidebarUI = false,
	children,
	placeholder = 'Label',
	defaultValues,
	taskStatusClassName,
	latestLabels,
	dropdownContentClassName
}: TTaskStatusesDropdown<'label'>) {
	const taskLabelsValue = useTaskLabelsValue();

	const { item, items, onChange, values } = useStatusValue<'label'>({
		status: taskLabelsValue,
		value: defaultValue,
		onValueChange,
		multiple,
		defaultValues
	});

	const handleOnChange = (labels: any) => {
		onChange(labels);
		if (latestLabels) {
			latestLabels.current = labels;
		}
	};

	return (
		<MultipleStatusDropdown
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? (placeholder as any) : undefined}
			onChange={handleOnChange}
			multiple={multiple}
			values={values}
			showButtonOnly
			taskStatusClassName={taskStatusClassName}
			dropdownContentClassName={dropdownContentClassName}
		>
			{children}
		</MultipleStatusDropdown>
	);
}

export function ActiveTaskLabelsDropdown(props: IActiveTaskStatuses<'label' | 'tags'>) {
	const taskLabelsValue = useTaskLabelsValue();
	const { item, items, onChange, field } = useActiveTaskStatus(props, taskLabelsValue, 'label');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			multiple={props.multiple}
		>
			{props.children}
		</StatusDropdown>
	);
}

//! =============== Task Project ================= //

export function ActiveTaskProjectDropdown(props: IActiveTaskStatuses<'project'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(props, {}, 'project');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			forDetails={props.forDetails}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== Task Project ================= //

export function ActiveTaskTeamDropdown(props: IActiveTaskStatuses<'team'>) {
	const { item, items, onChange, field } = useActiveTaskStatus(props, {}, 'team');

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			forDetails={props.forDetails}
			defaultItem={!item ? field : undefined}
			onChange={onChange}
		/>
	);
}

//! =============== FC Status dropdown ================= //

export function TaskStatus({
	children,
	name,
	icon,
	bgColor: backgroundColor,
	className,
	active = true,
	issueType = 'status',
	showIssueLabels,
	bordered,
	titleClassName,
	cheched = false,
	showIcon = true,
	sidebarUI = false,
	realName,
	isVersion,
	isEpic
}: PropsWithChildren<
	TStatusItem &
		IClassName & {
			active?: boolean;
			issueType?: 'status' | 'issue';
			showIssueLabels?: boolean;
			forDetails?: boolean;
			titleClassName?: string;
			cheched?: boolean;
			sidebarUI?: boolean;
			value?: string;
			isVersion?: boolean;
			isEpic?: boolean;
		}
>) {
	const { theme } = useTheme();
	const readableColorHex = readableColor(backgroundColor || (theme === 'light' ? '#FFF' : '#000'));

	return (
		<div
			className={cn(
				`p-1 flex items-center text-xs relative text-gray-500 dark:text-white gap-x-1.5 min-w-fit w-fit !rounded-[8px]`,

				sidebarUI ? 'text-dark rounded-md font-[500]' : 'space-x-0 rounded-xl',

				issueType === 'issue' && ['text-white'],

				active ? ['dark:text-default'] : ['bg-gray-200 dark:bg-gray-700 dark:border dark:border-[#FFFFFF21]'],

				bordered && ['input-border'],

				bordered && backgroundColor === 'transparent' && ['text-dark dark:text-white'],

				className
			)}
			style={{
				backgroundColor: active ? backgroundColor : undefined,
				color: getTextColor(backgroundColor ?? 'white')
			}}
		>
			<div
				className={cn(
					'flex overflow-hidden gap-x-0.5 items-center whitespace-nowrap text-ellipsis',
					'',
					titleClassName
				)}
			>
				{cheched ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width={20}
						height={20}
						className={cn(`fill-[${readableColorHex}]`)}
					>
						<path d="M9 19.4L3.3 13.7 4.7 12.3 9 16.6 20.3 5.3 21.7 6.7z" />
					</svg>
				) : (
					<>{showIcon && active && icon}</>
				)}

				{name && (issueType !== 'issue' || showIssueLabels) && (
					<div
						className={`overflow-hidden text-xs capitalize text-ellipsis`}
						title={realName || name}
						style={
							isVersion || isEpic
								? {
										color: theme === 'light' ? '#000' : '#FFF'
									}
								: {}
						}
					>
						{realName || name}
					</div>
				)}
			</div>
			{children}
		</div>
	);
}

/**
 * Fc Status drop down
 */
export function StatusDropdown<T extends TStatusItem>({
	value,
	onChange,
	items,
	className,
	taskStatusClassName,
	defaultItem,
	issueType = 'status',
	children,
	showIssueLabels,
	forDetails,
	enabled = true,
	showButtonOnly,
	multiple,
	values = [],
	disabled,
	showIcon = true,
	largerWidth = false,
	bordered = false,
	sidebarUI = false,
	disabledReason = '',
	isVersion = false,
	isEpic = false,
	onRemoveSelected
}: PropsWithChildren<{
	value: T | undefined;
	values?: NonNullable<T['name']>[];
	onChange?(value: string): void;
	items: T[];
	className?: string;
	taskStatusClassName?: string;
	defaultItem?: ITaskStatusField;
	issueType?: 'status' | 'issue';
	forDetails?: boolean;
	showIssueLabels?: boolean;
	enabled?: boolean;
	showButtonOnly?: boolean;
	multiple?: boolean;
	disabled?: boolean;
	showIcon?: boolean;
	largerWidth?: boolean;
	bordered?: boolean;
	sidebarUI?: boolean;
	disabledReason?: string;
	isVersion?: boolean;
	isEpic?: boolean;
	onRemoveSelected?: () => null;
}>) {
	let processedValues = [...new Set(values.map((v) => String(v)))];

	if (multiple && value) {
		const valueToAdd = String(value.value || value.name);

		if (valueToAdd && !processedValues.includes(valueToAdd)) {
			processedValues.push(valueToAdd);
		}
	}

	values = processedValues;
	const defaultValue: TStatusItem = {
		bgColor: undefined,
		icon: (
			<span>
				<CircleIcon className="w-4 h-4" />
			</span>
		),
		name: defaultItem
	};

	const currentValue = value || defaultValue;
	const hasBtnIcon = issueType === 'status' && !showButtonOnly;

	const button = (
		<TaskStatus
			{...currentValue}
			bordered={bordered}
			forDetails={forDetails}
			showIcon={showIcon}
			active={true}
			showIssueLabels={showIssueLabels}
			issueType={issueType}
			sidebarUI={sidebarUI}
			className={cn(
				`justify-between capitalize whitespace-nowrap overflow-hidden max-w-[90%]`,
				!forDetails && 'w-full max-w-[190px]',
				'flex items-center gap-x-1.5',
				sidebarUI && ['text-xs'],
				!value && [
					'!text-dark/40 dark:text-white/70',
					'bg-white dark:bg-[#1B1D22] border border-gray-200 dark:border-[#FFFFFF33]'
				],
				value && ['text-black dark:text-black', 'bg-white dark:bg-white border border-gray-200'],
				isVersion || (forDetails && !value) ? ['text-xs font-normal'] : ['text-sm font-normal'],
				className,
				isVersion && 'dark:text-white',
				'h-full transition-colors duration-200'
			)}
			titleClassName={cn(
				hasBtnIcon && ['whitespace-nowrap overflow-hidden max-w-[90%] text-ellipsis overflow-hidden'],
				!value && 'dark:text-white'
			)}
			isVersion={isVersion}
			isEpic={isEpic}
		>
			{/* If the issueType equal to status thee render the chevron down icon.  */}
			{issueType === 'status' && !showButtonOnly && (
				<ChevronDownIcon
					className={cn(
						'h-5 w-5 text-default transition duration-150 ease-in-out group-hover:text-opacity-80',
						(!value || currentValue.bordered) && ['text-dark dark:text-white'],
						hasBtnIcon && ['whitespace-nowrap w-5 h-5'],
						isVersion && 'dark:text-white'
					)}
					aria-hidden="true"
				/>
			)}
		</TaskStatus>
	);

	const dropdown = (
		<Tooltip className="h-full" label={disabledReason} enabled={!enabled} placement="auto">
			<div className={cn('relative', className)}>
				{(() => {
					const triggerContent = !multiple ? (
						<Tooltip
							enabled={hasBtnIcon && (value?.name || '').length > 10}
							label={capitalize(value?.name) || ''}
							className="h-full"
						>
							{button}
						</Tooltip>
					) : (
						<TaskStatus
							{...defaultValue}
							active={true}
							forDetails={forDetails}
							sidebarUI={sidebarUI}
							className={cn(
								'justify-between w-full capitalize h-full',
								sidebarUI && ['text-xs'],
								'text-dark dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light',
								forDetails && 'bg-transparent border dark:border-[#FFFFFF33] dark:bg-[#1B1D22]',
								taskStatusClassName
							)}
							name={
								values.length > 0
									? `Item${values.length === 1 ? '' : 's'} (${values.length})`
									: defaultValue.name
							}
							isEpic={isEpic}
						>
							<ChevronDownIcon className={cn('w-5 h-5 text-default dark:text-white')} />
						</TaskStatus>
					);

					const renderItem = (item: T, isSelected: boolean) => {
						// Obtenir la valeur de l'item pour la comparaison et les opérations de sélection
						const item_value = item.value || item.name;
						return (
							<div className="relative outline-none cursor-pointer w-full">
								<TaskStatus
									showIcon={showIcon}
									{...item}
									checked={isSelected}
									className={cn(
										'!w-full',
										issueType === 'issue' && ['rounded-md px-2 text-white'],
										sidebarUI && 'rounded-[8px]',
										bordered && 'input-border',
										(isVersion || isEpic) && 'dark:text-white',
										item?.className
									)}
								/>
								{isSelected && issueType !== 'issue' && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											if (onChange && multiple && item_value) {
												const newValues = values.filter(
													(v) => String(v) !== String(item_value)
												);
												onChange(newValues.join(','));
											}
											onRemoveSelected && onRemoveSelected();
										}}
										className="absolute top-2.5 right-2 h-4 w-4 bg-transparent"
									>
										<XMarkIcon className="text-dark" height={16} width={16} aria-hidden="true" />
									</button>
								)}
							</div>
						);
					};

					const handleChange = (selectedValue: any) => {
						if (!onChange) return;

						if (multiple) {
							// S'assurer que selectedValue est un tableau
							const valueArray = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

							// Convertir toutes les valeurs en chaînes
							const stringValues = valueArray.map(String);

							// Utiliser un Set pour garantir l'unicité des valeurs
							const uniqueValues = [...new Set(stringValues)];

							// Vérification supplémentaire pour s'assurer qu'il n'y a pas de doublons
							if (uniqueValues.length !== stringValues.length) {
								console.log('Doublons détectés et éliminés dans les valeurs sélectionnées');
							}

							// Passer la chaîne jointe au onChange
							onChange(uniqueValues.join(','));
						} else {
							// Pour la sélection simple, passer directement la valeur
							onChange(selectedValue);
						}
					};

					return (
						<CustomListboxDropdown
							value={value?.value || value?.name}
							// Convertir explicitement toutes les valeurs en chaînes pour éviter les problèmes de comparaison
							values={values.map(String)}
							onChange={handleChange}
							disabled={disabled}
							enabled={enabled}
							trigger={
								<div
									className={cn(!forDetails && 'w-full max-w-[170px]', 'cursor-pointer outline-none')}
									style={{
										width: largerWidth ? '160px' : ''
									}}
								>
									{triggerContent}
								</div>
							}
							items={items}
							renderItem={renderItem}
							multiple={multiple}
							dropdownClassName="max-h-[320px] overflow-auto scrollbar-hide !border-b-0 dark:bg-[#1B1D22]"
						/>
					);
				})()}
			</div>
		</Tooltip>
	);

	return dropdown;
}

/**
 * Multiple Status Dropdown Component
 */
export function MultipleStatusDropdown<T extends TStatusItem>({
	value,
	onChange,
	items,
	className,
	taskStatusClassName,
	dropdownContentClassName,
	defaultItem,
	issueType = 'status',
	children,
	forDetails,
	enabled = true,
	values = [],
	disabled,
	showIcon = true,
	largerWidth = false,
	bordered = false,
	sidebarUI = false,
	disabledReason = '',
	isVersion = false,
	onRemoveSelected
}: PropsWithChildren<{
	value: T | undefined;
	values?: NonNullable<T['name']>[];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onChange?(value: string[]): void;
	items: T[];
	className?: string;
	dropdownContentClassName?: string;
	taskStatusClassName?: string;
	defaultItem?: ITaskStatusField;
	issueType?: 'status' | 'issue';
	forDetails?: boolean;
	showIssueLabels?: boolean;
	enabled?: boolean;
	showButtonOnly?: boolean;
	multiple?: boolean;
	disabled?: boolean;
	showIcon?: boolean;
	largerWidth?: boolean;
	bordered?: boolean;
	sidebarUI?: boolean;
	disabledReason?: string;
	isVersion?: boolean;
	onRemoveSelected?: () => null;
}>) {
	// Si value existe mais n'est pas dans values, l'ajouter à values
	const valueToAdd = value?.value || value?.name;
	if (valueToAdd && !values.includes(valueToAdd)) {
		values = [...values, valueToAdd];
	}
	const defaultValue: TStatusItem = {
		bgColor: undefined,
		icon: (
			<span>
				<CircleIcon className="w-4 h-4" />
			</span>
		),
		name: defaultItem
	};

	const triggerButton = (
		<div
			className={cn(!forDetails && 'w-full max-w-[170px]', 'cursor-pointer outline-none')}
			style={{
				width: largerWidth ? '160px' : ''
			}}
		>
			<TaskStatus
				{...defaultValue}
				active={true}
				forDetails={forDetails}
				sidebarUI={sidebarUI}
				className={cn(
					'justify-between w-full capitalize',
					sidebarUI && ['text-xs'],
					' dark:text-white dark:bg-dark--theme-light',
					forDetails && 'bg-transparent border dark:border-[#FFFFFF33] dark:bg-[#1B1D22]',
					taskStatusClassName
				)}
				titleClassName={cn(
					values.length > 0 && '!text-dark dark:!text-white',
					!value && 'dark:text-white text-slate-500'
				)}
				name={
					values.length > 0 ? `Item${values.length === 1 ? '' : 's'} (${values.length})` : defaultValue.name
				}
			>
				<ChevronDownIcon className={cn('w-5 h-5 text-default dark:text-white')} />
			</TaskStatus>
		</div>
	);

	// Function to render each item in the dropdown
	const renderItem = (item: T, isSelected: boolean) => {
		const item_value = item.value || item.name;
		return (
			<div className="relative outline-none cursor-pointer w-full">
				<TaskStatus
					showIcon={showIcon}
					{...item}
					checked={isSelected}
					className={cn(
						'!w-full',
						issueType === 'issue' && ['rounded-md px-2 text-white'],
						sidebarUI && 'rounded-[8px]',
						bordered && 'input-border',
						isVersion && 'dark:text-white'
					)}
				/>
				{isSelected && issueType !== 'issue' && (
					<button
						onClick={(e: any) => {
							e.stopPropagation();

							if (onChange && item_value) {
								// Utiliser une comparaison de chaînes pour une suppression plus robuste
								const stringItemValue = String(item_value);
								const newValues = values.filter((v) => String(v) !== stringItemValue);
								onChange(newValues);
							}

							onRemoveSelected && onRemoveSelected();
						}}
						className="absolute top-2.5 right-2 h-4 w-4 bg-transparent"
					>
						<XMarkIcon className="text-dark" height={16} width={16} aria-hidden="true" />
					</button>
				)}
			</div>
		);
	};

	// Handle item selection
	const handleChange = (selectedValue: any) => {
		if (!onChange) return;
		onChange(selectedValue);
	};

	const dropdown = (
		<Tooltip label={disabledReason} enabled={!enabled} placement="auto">
			<div className={cn('relative', className)}>
				<CustomListboxDropdown
					value={value?.value || value?.name}
					// Convertir explicitement toutes les valeurs en chaînes pour éviter les problèmes de comparaison
					values={values.map(String)}
					onChange={handleChange}
					disabled={disabled}
					enabled={enabled}
					trigger={triggerButton}
					items={items}
					renderItem={renderItem}
					multiple={true}
					dropdownClassName="flex flex-col gap-2.5 max-h-[320px] overflow-auto scrollbar-hide !border-b-0 dark:bg-[#1B1D22]"
				>
					{children && <div className="mt-2">{children}</div>}
				</CustomListboxDropdown>
			</div>
		</Tooltip>
	);
	return dropdown;
}
