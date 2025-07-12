import { useStatusValue } from '@/core/hooks';
import { useMapToTaskStatusValues } from '@/core/hooks/tasks/use-map-to-task-status-values';
import { useTaskSizes } from '@/core/hooks/tasks/use-task-sizes';
import { TTaskStatusesDropdown } from '@/core/types/interfaces/task/task-card';
import { TTaskStatus } from '@/core/types/schemas';
import { StatusDropdown } from './task-status';

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
	children,
	isMultiple = false
}: TTaskStatusesDropdown<'size'>) {
	const { taskSizes } = useTaskSizes();
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
