/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';
import { StatusDropdown } from './task-status';

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
