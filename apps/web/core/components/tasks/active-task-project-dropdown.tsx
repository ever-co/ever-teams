//! =============== Task Project ================= //

import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { StatusDropdown } from './task-status';
import { IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';

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
