'use client';

import type { ReactElement } from 'react';
import { useStatusValue, useTaskStatusValue } from '@/core/hooks';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import type { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import type { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import type { TStatus, TTaskStatusesDropdown } from '@/core/types/interfaces/task/task-card';
import type { TaskPropertyKind } from './task-property-icon';
import { taskIssues } from './task-issue';
import { StatusDropdown } from './task-status';

type TaskStatusModalProps<T extends ITaskStatusField> = { types: T } & TTaskStatusesDropdown<T>;

interface PickerProps {
	defaultValue?: string;
	onValueChange: (value: string) => void;
	className?: string;
	disabled?: boolean;
}

const NO_OPTIONS: TStatus = {};

function issueTypeOf(kind: TaskPropertyKind | undefined) {
	if (kind === 'issueType') {
		return 'issue';
	}
	return 'status';
}

function PropertyPicker({
	options,
	kind,
	defaultValue,
	onValueChange,
	className,
	disabled
}: Readonly<PickerProps & { options: TStatus; kind?: TaskPropertyKind }>) {
	const { item, items, onChange } = useStatusValue<'status'>({
		status: options,
		value: defaultValue,
		onValueChange
	});
	return (
		<StatusDropdown
			kind={kind}
			issueType={issueTypeOf(kind)}
			items={items}
			value={item}
			onChange={onChange}
			className={className}
			disabled={disabled}
		/>
	);
}

function StatusPicker(props: Readonly<PickerProps>) {
	const options = useTaskStatusValue();
	return <PropertyPicker {...props} options={options} kind="status" />;
}

function PriorityPicker(props: Readonly<PickerProps>) {
	const options = useTaskPrioritiesValue();
	return <PropertyPicker {...props} options={options} kind="priority" />;
}

function SizePicker(props: Readonly<PickerProps>) {
	const options = useTaskSizesValue();
	return <PropertyPicker {...props} options={options} kind="size" />;
}

function LabelPicker(props: Readonly<PickerProps>) {
	const options = useTaskLabelsValue();
	return <PropertyPicker {...props} options={options} kind="label" />;
}

function IssueTypePicker(props: Readonly<PickerProps>) {
	return <PropertyPicker {...props} options={taskIssues} kind="issueType" />;
}

function EmptyPicker(props: Readonly<PickerProps>) {
	return <PropertyPicker {...props} options={NO_OPTIONS} />;
}

const PICKERS: Partial<Record<ITaskStatusField, (props: Readonly<PickerProps>) => ReactElement>> = {
	status: StatusPicker,
	priority: PriorityPicker,
	size: SizePicker,
	label: LabelPicker,
	issueType: IssueTypePicker
};

/**
 * A task row's property picker, kept under its old name: the app's property menu, anchored to the row's pill, which
 * applies the value on pick. A row subscribes only to the list of the property it shows.
 */
export function TaskStatusModal<T extends ITaskStatusField>({
	types,
	defaultValue,
	onValueChange,
	className,
	disabled
}: TaskStatusModalProps<T>) {
	const Picker = PICKERS[types] ?? EmptyPicker;
	const handleValueChange = (value: string) => {
		onValueChange?.(value as ITaskStatusStack[T]);
	};
	return (
		<Picker
			defaultValue={defaultValue as string | undefined}
			onValueChange={handleValueChange}
			className={className}
			disabled={disabled}
		/>
	);
}
