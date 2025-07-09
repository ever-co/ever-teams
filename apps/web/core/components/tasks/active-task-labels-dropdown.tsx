/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { IActiveTaskStatuses } from '@/core/types/interfaces/task/task-card';

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
