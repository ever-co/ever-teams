'use client';
import { VisibilityState } from '@tanstack/react-table';
import { TasksDataTable } from './tasks-data-table';
import { columns } from './columns';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function TaskTable({
	currentItems,
	columnVisibility
}: Readonly<{ currentItems: TTask[]; columnVisibility: VisibilityState }>) {
	return (
		<TasksDataTable
			columns={columns}
			columnVisibility={columnVisibility}
			className="border-none"
			data={currentItems}
		/>
	);
}
