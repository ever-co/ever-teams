'use client';
import { VisibilityState } from '@tanstack/react-table';
import { TasksDataTable } from './tasks-data-table';
import { columns } from './columns';
import { ITask } from '@/core/types/interfaces/task/task';

export function TaskTable({
	currentItems,
	columnVisibility
}: Readonly<{ currentItems: ITask[]; columnVisibility: VisibilityState }>) {
	return (
		<TasksDataTable
			columns={columns}
			columnVisibility={columnVisibility}
			className="border-none"
			data={currentItems}
		/>
	);
}
