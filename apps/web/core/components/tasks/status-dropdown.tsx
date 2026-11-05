import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { statusIcons } from './status-icons';
import { useTranslations } from 'next-intl';
import { useUpdateTask } from '@/core/hooks/organizations';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { activeTeamTaskState } from '@/core/stores';
import { TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TaskPropertyIcon } from './task-property-icon';
import { TaskPropertyMenu, TaskPropertyMenuOption } from './task-property-menu';
import { TaskPropertyPill } from './task-property-trigger';
import { TaskPropertyValue } from './task-status';

const statusKeys = Object.keys(statusIcons) as ETaskStatusName[];

function statusIconColor(status: string) {
	const statusIcon = statusIcons[status] as ReactElement<{ color?: string }> | undefined;
	return statusIcon?.props.color;
}

function statusOption(status: string): TaskPropertyMenuOption<string> {
	return {
		key: status,
		value: status,
		label: status,
		icon: <TaskPropertyIcon kind="status" name={status} color={statusIconColor(status)} />
	};
}

function selectedStatusItem(status: string): TStatusItem {
	const color = statusIconColor(status);
	return {
		name: status,
		bgColor: color,
		icon: <TaskPropertyIcon kind="status" name={status} color={color} />
	};
}

const StatusDropdown = () => {
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	return <RawStatusDropdown task={activeTeamTask} />;
};

export function RawStatusDropdown({ task }: { task: TTask | null }) {
	const { updateTask, updateLoading } = useUpdateTask();
	const t = useTranslations();
	const [selected, setSelected] = useState<string | null>(task?.status || null);
	const hasTask = Boolean(task);

	useEffect(() => {
		setSelected(task?.status || null);
	}, [task]);

	useEffect(() => {
		setSelected(task?.status || null);
	}, [task]);

	const handleChange = useCallback(
		(status: string | null) => {
			// Guard against null values - preserve existing behavior
			if (!status) return;

			setSelected(status);

			if (task && status !== task.status) {
				updateTask({
					...task,
					taskStatusId: task.taskStatusId,
					status: status
				});
			}
		},
		[task, updateTask]
	);

	const options = useMemo(() => statusKeys.map(statusOption), []);

	const isStatusSelected = useCallback((status: string) => status === selected, [selected]);

	return (
		<div className="w-[145px] max-w-[150px]">
			<TaskPropertyMenu
				options={options}
				isSelected={isStatusSelected}
				onSelect={handleChange}
				searchPlaceholder={t('taskMenus.search.status')}
				disabled={!hasTask}
				triggerClassName="flex w-full rounded-md"
			>
				{selected && (
					<TaskPropertyValue
						item={selectedStatusItem(selected)}
						isLoading={updateLoading}
						showsChevron={true}
						className="w-full max-w-full"
					/>
				)}
				{!selected && (
					<TaskPropertyPill
						kind="status"
						label={t('common.STATUS')}
						isLoading={updateLoading}
						className="w-full justify-between"
					/>
				)}
			</TaskPropertyMenu>
		</div>
	);
}

export default StatusDropdown;
