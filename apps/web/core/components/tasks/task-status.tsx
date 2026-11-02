'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { Nullable } from '@/core/types/generics/utils';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { CSSProperties, PropsWithChildren, ReactNode, useCallback, useMemo } from 'react';
import { useStatusValue, useTaskStatusValue } from '@/core/hooks';
import { useTaskSizesQuery } from '@/core/hooks/tasks/use-task-sizes-query';
import { Check } from '@/core/components/icons';
import { Tooltip } from '../duplicated-components/tooltip';
import { cn } from '@/core/lib/helpers';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TTaskStatus } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TStatusItem, TTaskStatusesDropdown, IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';
import { MultipleStatusDropdown } from './multiple-status-dropdown';
import { useTaskVersionsValue } from '@/core/hooks/tasks/use-task-versions-value';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useMapToTaskStatusValues } from '@/core/hooks/tasks/use-map-to-task-status-values';
import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { tasksByTeamState } from '@/core/stores';
import { dataColorChipStyle, isPaintableColor } from './task-data-color';
import { TaskPropertyIcon, TaskPropertyKind } from './task-property-icon';
import { TaskPropertyMenu, TaskPropertyMenuOption, toggleMenuSelection } from './task-property-menu';
import {
	TASK_PROPERTY_PILL_RECIPE,
	TaskPropertyCountChip,
	TaskPropertyPill,
	TaskPropertyTriggerEnd,
	taskPropertyFieldKey,
	taskPropertyKindFromField,
	taskPropertySearchKey,
	taskPropertyTriggerWidthStyle
} from './task-property-trigger';

function taskStatusStyle(
	color: Nullable<string> | undefined,
	isIssueTile: boolean,
	active: boolean
): CSSProperties | undefined {
	if (!active) {
		return undefined;
	}
	if (!isPaintableColor(color)) {
		return undefined;
	}
	if (isIssueTile) {
		return undefined;
	}
	return dataColorChipStyle(color);
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
			kind="status"
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
			kind="status"
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
			kind="status"
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
			kind="version"
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
			kind="version"
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
	taskStatusClassName,
	defaultValues
}: TTaskStatusesDropdown<'epic'>) {
	const tasks = useAtomValue(tasksByTeamState);
	const status = useMemo(() => {
		const temp: any = {};
		tasks.forEach((task) => {
			if (task.issueType === 'Epic') {
				temp[`#${task.taskNumber} ${task.title}`] = {
					id: task.id,
					name: `#${task.taskNumber} ${task.title}`,
					value: task.id,
					icon: <TaskPropertyIcon kind="epic" />
				};
			}
		});
		return temp;
	}, [tasks]);
	const { item, items, onChange, values } = useStatusValue<'epic'>({
		status,
		value: defaultValue,
		onValueChange,
		multiple,
		defaultValues
	});

	return (
		<MultipleStatusDropdown
			kind="epic"
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
			defaultItem={!item ? 'epic' : undefined}
			onChange={onChange}
			values={values}
			taskStatusClassName={taskStatusClassName}
			isVersion={false}
		>
			{children}
		</MultipleStatusDropdown>
	);
}

//! =============== Task Status ================= //

const PRIORITY_RANK: Record<string, number> = {
	urgent: 0,
	highest: 0,
	high: 1,
	medium: 2,
	normal: 2,
	low: 3,
	lowest: 4
};

const UNKNOWN_PRIORITY_RANK = 5;

function priorityRankOf(item: TStatusItem) {
	const key = (item.value || item.name || '').toString().toLowerCase();
	return PRIORITY_RANK[key] ?? UNKNOWN_PRIORITY_RANK;
}

/** Linear's order, from the most to the least pressing; priorities the app does not know keep their API order. */
function orderByPriorityRank<T extends TStatusItem>(items: T[]) {
	return [...items].sort((first, second) => priorityRankOf(first) - priorityRankOf(second));
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
	const orderedItems = useMemo(() => orderByPriorityRank(items), [items]);

	return (
		<StatusDropdown
			kind="priority"
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={orderedItems}
			value={item}
			defaultItem={!item ? 'priority' : undefined}
			onChange={onChange}
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
			kind="priority"
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
			className={className}
			bordered={false}
		/>
	) : (
		<></>
	);
}

export function ActiveTaskSizesDropdown(props: IActiveTaskStatuses<'size'>) {
	const { taskSizes } = useTaskSizesQuery();
	const taskSizesValue = useMapToTaskStatusValues(taskSizes as TTaskStatus[], 'size');

	const { item, items, onChange, field, isLocalLoading } = useActiveTaskStatus(props, taskSizesValue, 'size');

	return (
		<StatusDropdown
			kind="size"
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
	placeholder,
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
			kind="label"
			placeholderLabel={placeholder}
			sidebarUI={sidebarUI}
			forDetails={forDetails}
			className={className}
			items={items}
			value={item}
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
			kind="team"
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
	checked = false,
	showIcon = true,
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
			checked?: boolean;
			sidebarUI?: boolean;
			value?: string;
			isVersion?: boolean;
			isEpic?: boolean;
		}
>) {
	const isIssueType = issueType === 'issue';
	const allowsName = !isIssueType || Boolean(showIssueLabels);
	const showsName = Boolean(name) && allowsName;
	const isIssueTile = isIssueType && !showsName;
	const isNeutralText = isVersion || isEpic;
	const isPainted = active && isPaintableColor(backgroundColor);
	const isChip = isPainted && !isIssueTile;
	const style = taskStatusStyle(backgroundColor, isIssueTile, active);
	const isIconShown = showIcon && active;
	const statusIcon = isIconShown && icon;
	const iconNode = statusIcon;

	return (
		<div
			className={cn(
				'relative flex h-6 w-fit min-w-fit items-center gap-x-1.5 rounded-md px-2 text-xs font-medium transition-colors',
				'[&_[data-slot=task-property-icon]]:size-3.5',
				!isChip && 'text-foreground',
				isChip && 'chip-3d',
				!isIssueType && '[&_img]:size-3.5 dark:[&_img]:invert',
				isIssueTile && 'h-auto justify-center p-0 [&_[data-slot=task-property-icon]]:size-4',
				!active && 'bg-foreground/5 text-muted-foreground',
				bordered && 'input-border',
				className
			)}
			style={style}
		>
			<div
				className={cn(
					'flex items-center gap-x-1 overflow-hidden text-ellipsis whitespace-nowrap text-current',
					titleClassName
				)}
			>
				{checked && <Check className="size-4 shrink-0" />}
				{!checked && iconNode}

				{showsName && (
					<div
						className={cn('min-w-0 truncate capitalize', isNeutralText && 'text-foreground')}
						title={realName || name}
					>
						{realName || name}
					</div>
				)}
			</div>
			{children}
		</div>
	);
}

export function statusItemValue(item: TStatusItem) {
	if (item.value !== undefined) {
		return item.value;
	}
	return item.name;
}

function isItemSelected(item: TStatusItem, selectedValues: string[]) {
	const itemValue = statusItemValue(item);
	return selectedValues.some((selected) => String(selected) === itemValue);
}

function statusItemLabel(item: TStatusItem) {
	return item.realName || item.name || '';
}

function statusOptionIcon(item: TStatusItem, kind: TaskPropertyKind): ReactNode {
	if (kind === 'issueType') {
		return <TaskPropertyIcon kind="issueType" name={statusItemValue(item)} color={item.bgColor} />;
	}
	return item.icon;
}

export function statusMenuOption(
	item: TStatusItem,
	index: number,
	kind: TaskPropertyKind
): TaskPropertyMenuOption<string | undefined> {
	const optionValue = statusItemValue(item);
	return {
		key: `${index}-${optionValue}`,
		value: optionValue,
		label: statusItemLabel(item),
		icon: statusOptionIcon(item, kind)
	};
}

function triggerRadiusClass(item: TStatusItem | undefined) {
	const isPainted = isPaintableColor(item?.bgColor);
	if (isPainted) {
		return 'rounded-md';
	}
	return 'rounded-full';
}

function iconOnlyTriggerLabel(isIssueMenu: boolean, showIssueLabels: boolean | undefined, label: string) {
	const isIconOnly = isIssueMenu && !showIssueLabels;
	if (!isIconOnly) {
		return undefined;
	}
	return label;
}

function resolveStatusDropdownKind(
	kind: TaskPropertyKind | undefined,
	defaultItem: ITaskStatusField | undefined,
	isIssueMenu: boolean
): TaskPropertyKind {
	if (kind) {
		return kind;
	}
	if (isIssueMenu) {
		return 'issueType';
	}
	return taskPropertyKindFromField(defaultItem, 'status');
}

function selectionCountLabel(t: ReturnType<typeof useTranslations>, kind: TaskPropertyKind, count: number) {
	if (kind === 'label') {
		return t('taskMenus.labelsCount', { count });
	}
	return t('taskMenus.selectedCount', { count });
}

interface TaskPropertyValueProps {
	item: TStatusItem;
	isLoading?: boolean;
	showsChevron?: boolean;
	showIcon?: boolean;
	forDetails?: boolean;
	sidebarUI?: boolean;
	isVersion?: boolean;
	isEpic?: boolean;
	className?: string;
	titleClassName?: string;
}

export function TaskPropertyValue({
	item,
	isLoading,
	showsChevron,
	showIcon = true,
	forDetails,
	sidebarUI,
	isVersion,
	isEpic,
	className,
	titleClassName
}: TaskPropertyValueProps) {
	const isPainted = isPaintableColor(item.bgColor);
	return (
		<TaskStatus
			{...item}
			active={true}
			showIcon={showIcon}
			forDetails={forDetails}
			sidebarUI={sidebarUI}
			isVersion={isVersion}
			isEpic={isEpic}
			className={cn(
				'h-7 min-w-0 max-w-full justify-between gap-x-1.5 overflow-hidden whitespace-nowrap capitalize',
				!forDetails && 'w-full max-w-fit',
				!isPainted && TASK_PROPERTY_PILL_RECIPE,
				!isPainted && 'text-xs font-medium text-foreground',
				className
			)}
			titleClassName={cn('min-w-0 overflow-hidden text-ellipsis whitespace-nowrap', titleClassName)}
		>
			<TaskPropertyTriggerEnd isLoading={isLoading} showsChevron={showsChevron} />
		</TaskStatus>
	);
}

interface TaskPropertySelectionProps {
	kind: TaskPropertyKind;
	selectedItems: TStatusItem[];
	placeholder: string;
	isLoading?: boolean;
	showsChevron?: boolean;
	forDetails?: boolean;
	className?: string;
}

export function TaskPropertySelection({
	kind,
	selectedItems,
	placeholder,
	isLoading,
	showsChevron = true,
	forDetails,
	className
}: TaskPropertySelectionProps) {
	const t = useTranslations();
	const selectedCount = selectedItems.length;

	if (selectedCount === 0) {
		return (
			<TaskPropertyPill
				kind={kind}
				label={placeholder}
				isLoading={isLoading}
				showsChevron={showsChevron}
				className={cn('w-full justify-between', className)}
			/>
		);
	}

	if (selectedCount === 1) {
		return (
			<TaskPropertyValue
				item={selectedItems[0]}
				isLoading={isLoading}
				showsChevron={showsChevron}
				forDetails={forDetails}
				className={className}
			/>
		);
	}

	const colors = selectedItems.map((item) => item.bgColor);
	return (
		<TaskPropertyCountChip
			label={selectionCountLabel(t, kind, selectedCount)}
			colors={colors}
			isLoading={isLoading}
			showsChevron={showsChevron}
			className={cn('w-full justify-between', className)}
		/>
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
	sidebarUI = false,
	disabledReason = '',
	isVersion = false,
	isEpic = false,
	isMultiple = true,
	isLoading = false,
	titleClassName = '',
	kind
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
	titleClassName?: string;
	kind?: TaskPropertyKind;
}>) {
	const t = useTranslations();
	const isIssueMenu = issueType === 'issue';
	const propertyKind = resolveStatusDropdownKind(kind, defaultItem, isIssueMenu);
	const fieldLabel = t(taskPropertyFieldKey(propertyKind));
	const searchPlaceholder = t(taskPropertySearchKey(propertyKind));

	const processedValues = useMemo(() => {
		const processedValues = [...new Set(values)];
		if (multiple && value) {
			const valueToAdd = value.value || value.name;
			if (valueToAdd && !processedValues.some((v) => v === valueToAdd)) {
				processedValues.push(valueToAdd);
			}
		}
		return processedValues;
	}, [values, multiple, value]);

	const currentValue = value?.value || value?.name;
	const hasBtnIcon = issueType === 'status' && !showButtonOnly;
	const triggerLabel = iconOnlyTriggerLabel(isIssueMenu, showIssueLabels, fieldLabel);
	const isMenuDisabled = disabled || !enabled;
	const togglesValues = isMultiple && Boolean(multiple);
	const triggerWidthStyle = taskPropertyTriggerWidthStyle(largerWidth);

	const options = useMemo(
		() => items.map((item, index) => statusMenuOption(item, index, propertyKind)),
		[items, propertyKind]
	);

	const selectedItems = useMemo(
		() => items.filter((item) => isItemSelected(item, processedValues)),
		[items, processedValues]
	);

	const isOptionSelected = useCallback(
		(optionValue: string | undefined) => {
			const optionKey = String(optionValue);
			if (multiple) {
				return processedValues.some((selected) => String(selected) === optionKey);
			}
			const hasCurrentValue = currentValue !== undefined;
			return hasCurrentValue && String(currentValue) === optionKey;
		},
		[multiple, processedValues, currentValue]
	);

	const handleSelect = useCallback(
		(optionValue: string | undefined) => {
			if (!onChange) {
				return;
			}
			if (optionValue === undefined) {
				return;
			}
			if (!togglesValues) {
				onChange(optionValue);
				return;
			}
			const nextValues = toggleMenuSelection(processedValues.map(String), optionValue);
			onChange(nextValues.join(','));
		},
		[onChange, togglesValues, processedValues]
	);

	let triggerContent: ReactNode;
	let triggerShape = triggerRadiusClass(value);
	if (multiple) {
		triggerShape = 'rounded-md';
		triggerContent = (
			<TaskPropertySelection
				kind={propertyKind}
				selectedItems={selectedItems}
				placeholder={fieldLabel}
				isLoading={isLoading}
				forDetails={forDetails}
				className={taskStatusClassName}
			/>
		);
	} else if (isIssueMenu && value) {
		triggerShape = 'rounded-md';
		triggerContent = (
			<TaskStatus
				{...value}
				forDetails={forDetails}
				showIcon={showIcon}
				active={true}
				showIssueLabels={showIssueLabels}
				issueType={issueType}
				sidebarUI={sidebarUI}
				className={cn(
					'h-full max-w-[90%] justify-between gap-x-1.5 overflow-hidden whitespace-nowrap capitalize',
					!forDetails && 'w-full max-w-fit',
					className
				)}
				titleClassName={titleClassName}
				isVersion={isVersion}
				isEpic={isEpic}
			>
				<TaskPropertyTriggerEnd isLoading={isLoading} showsChevron={false} />
			</TaskStatus>
		);
	} else if (value) {
		triggerContent = (
			<TaskPropertyValue
				item={value}
				isLoading={isLoading}
				showsChevron={hasBtnIcon}
				showIcon={showIcon}
				forDetails={forDetails}
				sidebarUI={sidebarUI}
				isVersion={isVersion}
				isEpic={isEpic}
				className={className}
				titleClassName={titleClassName}
			/>
		);
	} else {
		triggerContent = (
			<TaskPropertyPill
				kind={propertyKind}
				label={fieldLabel}
				isLoading={isLoading}
				showsChevron={hasBtnIcon}
				className={cn(!forDetails && 'w-full max-w-fit', className)}
			/>
		);
	}

	const triggerClassName = cn('block max-w-full text-left', !forDetails && 'w-full max-w-[170px]', triggerShape);

	return (
		<div className={cn('relative', className)}>
			<Tooltip className="h-full" label={disabledReason} enabled={!enabled} placement="auto">
				{showButtonOnly ? (
					<div className={triggerClassName} style={triggerWidthStyle}>
						{triggerContent}
					</div>
				) : (
					<TaskPropertyMenu
						options={options}
						isSelected={isOptionSelected}
						onSelect={handleSelect}
						searchPlaceholder={searchPlaceholder}
						triggerClassName={triggerClassName}
						triggerStyle={triggerWidthStyle}
						triggerLabel={triggerLabel}
						multiple={Boolean(multiple)}
						disabled={isMenuDisabled}
						footer={children}
						optionLabelClassName="capitalize"
					>
						{triggerContent}
					</TaskPropertyMenu>
				)}
			</Tooltip>
		</div>
	);
}
