'use client';
import { VisibilityState } from '@tanstack/react-table';
import { TasksDataTable } from './tasks-data-table';
import { useTaskColumns } from './columns';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function TaskTable({
	currentItems,
	columnVisibility
}: Readonly<{ currentItems: TTask[]; columnVisibility: VisibilityState }>) {
	const columns = useTaskColumns();
	return <TasksDataTable columns={columns} columnVisibility={columnVisibility} data={currentItems} />;
}
