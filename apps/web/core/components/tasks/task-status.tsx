'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { Nullable } from '@/core/types/generics/utils';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { PropsWithChildren, useMemo } from 'react';
import { useStatusValue, useTaskSizes, useTaskStatusValue, useTeamTasks } from '@/core/hooks';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { readableColor } from 'polished';
import { useTheme } from 'next-themes';
import { Square4OutlineIcon, CircleIcon } from 'assets/svg';
import { getTextColor } from '@/core/lib/helpers/index';
import { Tooltip } from '../duplicated-components/tooltip';
import { CustomListboxDropdown } from './custom-dropdown';
import { capitalize } from 'lodash';
import { cn } from '@/core/lib/helpers';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TStatusItem, TTaskStatusesDropdown, IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';
import { MultipleStatusDropdown } from './multiple-status-dropdown';
import { useTaskVersionsValue } from '@/core/hooks/tasks/use-task-versions-value';
import { SpinnerLoader } from '@/core/components/common/loader';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useMapToTaskStatusValues } from '@/core/hooks/tasks/use-map-to-task-status-values';
import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';

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
	largerWidth,
	isMultiple = true
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
			isMultiple={isMultiple}
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
		() => items.filter((status) => Object.values(ETaskStatusName).includes(status.value as ETaskStatusName)),
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

	const { item, items, onChange, field, isLocalLoading } = useActiveTaskStatus(props, taskStatusValues, 'status');

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
			isLoading={isLocalLoading}
		>
			{props.children}
		</StatusDropdown>
	);
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
	isMultiple = false,
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
			onChange={onChange as any}
			multiple={multiple}
			isMultiple={isMultiple}
			values={values as any}
			largerWidth={largerWidth}
		>
			{children}
		</StatusDropdown>
	);
}

export function ActiveTaskPropertiesDropdown(props: IActiveTaskStatuses<'priority'>) {
	const taskPrioritiesValues = useTaskPrioritiesValue();

	const { item, items, onChange, field, isLocalLoading } = useActiveTaskStatus(
		props,
		taskPrioritiesValues,
		'priority'
	);

	return (
		<StatusDropdown
			className={props.className}
			items={items}
			value={item}
			defaultItem={!item ? field : undefined}
			onChange={props.onValueChange ? props.onValueChange : (onChange as any)}
			disabled={props.disabled}
			sidebarUI={props.sidebarUI}
			forDetails={props.forDetails}
			largerWidth={props.largerWidth}
			taskStatusClassName={props.taskStatusClassName}
			isLoading={isLocalLoading}
		>
			{props.children}
		</StatusDropdown>
	);
}

export function TaskPriorityStatus({
	task,
	className,
	showIssueLabels
}: { task: Nullable<TTask>; showIssueLabels?: boolean } & IClassName) {
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

export function ActiveTaskSizesDropdown(props: IActiveTaskStatuses<'size'>) {
	const { taskSizes } = useTaskSizes();
	const taskSizesValue = useMapToTaskStatusValues(taskSizes as TTaskStatus[], false);

	const { item, items, onChange, field, isLocalLoading } = useActiveTaskStatus(props, taskSizesValue, 'size');

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
			isLoading={isLocalLoading}
		>
			{props.children}
		</StatusDropdown>
	);
}

//! =============== Task Label ================= //

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
	dropdownContentClassName,
	isLoading = false
}: TTaskStatusesDropdown<'label'> & { isLoading?: boolean }) {
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
			isLoading={isLoading}
		>
			{children}
		</MultipleStatusDropdown>
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
				backgroundColor: active ? (backgroundColor ?? undefined) : undefined,
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
	onRemoveSelected,
	isMultiple = true,
	isLoading = false
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
	isMultiple?: boolean;
	isLoading?: boolean;
}>) {
	const processedValues = [...new Set(values)];
	if (multiple && value) {
		const valueToAdd = value.value || value.name;
		if (valueToAdd && !processedValues.some((v) => v === valueToAdd)) {
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
			{isLoading ? (
				<SpinnerLoader size={12} variant="dark-white" />
			) : (
				issueType === 'status' &&
				!showButtonOnly && (
					<ChevronDownIcon
						className={cn(
							'h-5 w-5 text-default transition duration-150 ease-in-out group-hover:text-opacity-80',
							(!value || currentValue.bordered) && ['text-dark dark:text-white'],
							hasBtnIcon && ['whitespace-nowrap w-5 h-5'],
							isVersion && 'dark:text-white'
						)}
						aria-hidden="true"
					/>
				)
			)}
		</TaskStatus>
	);

	const dropdown = (
		<div className={cn('relative', className)}>
			<Tooltip className="h-full" label={disabledReason} enabled={!enabled} placement="auto">
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
						const item_value = item.value || item.name;
						return (
							<div className="w-full outline-none cursor-pointer">
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
										item.className
									)}
								/>
								{isSelected && issueType !== 'issue' && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											if (onChange && multiple && item_value) {
												const newValues = values.filter((v) => v !== item_value);
												onChange(newValues.join(','));
											}
											onRemoveSelected?.();
										}}
										className="absolute top-2.5 right-2.5 h-4 w-4 bg-transparent bg-white dark:bg-black rounded"
									>
										<XMarkIcon
											className="text-dark dark:text-white"
											height={16}
											width={16}
											aria-hidden="true"
										/>
									</button>
								)}
							</div>
						);
					};

					const handleChange = (selectedValue: any) => {
						if (!onChange) return;

						if (multiple) {
							const valueArray = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
							const uniqueValues = [...new Set(valueArray)];
							onChange(uniqueValues.join(','));
						} else {
							onChange(selectedValue);
						}
					};

					if (showButtonOnly) {
						return (
							<div
								className={cn(!forDetails && 'w-full max-w-[170px]', 'cursor-pointer outline-none')}
								style={{
									width: largerWidth ? '160px' : ''
								}}
							>
								{triggerContent}
							</div>
						);
					}

					return (
						<CustomListboxDropdown
							children={children}
							isMultiple={isMultiple}
							value={value?.value || value?.name}
							values={values}
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
							renderItem={renderItem as any}
							multiple={multiple}
							dropdownClassName="max-h-[320px] overflow-auto scrollbar-hide !border-b-0 dark:bg-[#1B1D22]"
						/>
					);
				})()}
			</Tooltip>
		</div>
	);

	return dropdown;
}
