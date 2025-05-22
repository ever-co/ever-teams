'use client';
import { VisibilityState } from '@tanstack/react-table';
import { ITask } from '@/core/types/interfaces/to-review';
import { TasksDataTable } from './tasks-data-table';
import { columns } from './columns';

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
