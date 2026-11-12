'use client';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { useMemo } from 'react';
import { TTaskStatus } from '@/core/types/schemas';
import { TStatus } from '@/core/types/interfaces/task/task-card';
import { TaskPropertyIcon, TaskPropertyKind } from '@/core/components/tasks/task-property-icon';

export function useMapToTaskStatusValues<T extends Omit<TTaskStatus, 'name'> & { name: string }>(
	data: T[],
	kind: TaskPropertyKind,
	bordered = false
): TStatus<any> {
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
					<TaskPropertyIcon kind={kind} name={item.value || item.name} color={item.color} icon={item.icon} />
				)
			};

			if (value.value) {
				acc[value.value] = value;
			} else if (value.name) {
				acc[value.name] = value;
			}
			return acc;
		}, {} as TStatus<any>);
	}, [data, kind, bordered]);
}
