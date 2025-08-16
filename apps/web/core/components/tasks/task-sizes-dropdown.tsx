import { useStatusValue } from '@/core/hooks';
import { useMapToTaskStatusValues } from '@/core/hooks/tasks/use-map-to-task-status-values';
import { taskSizesListState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { TTaskStatusesDropdown } from '@/core/types/interfaces/task/task-card';
import { TTaskStatus } from '@/core/types/schemas';
import { StatusDropdown } from './task-status';

/**
 * Task dropdown that lets you select a task size
 * @param {TTaskStatusesDropdown<'size'>} props - Props for the task sizes dropdown component
 */
export function TaskSizesDropdown({
	className,
	defaultValue,
	onValueChange,
	forDetails,
	multiple,
	largerWidth,
	sidebarUI = false,
	children,
	isMultiple = false
}: TTaskStatusesDropdown<'size'>) {
	const taskSizes = useAtomValue(taskSizesListState);
	const taskSizesValue = useMapToTaskStatusValues(taskSizes as TTaskStatus[], false);

	const { item, items, onChange, values } = useStatusValue<'size'>({
		status: taskSizesValue,
		value: defaultValue,
		onValueChange,
		multiple
	});

	return (
		<StatusDropdown
			isMultiple={isMultiple}
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
