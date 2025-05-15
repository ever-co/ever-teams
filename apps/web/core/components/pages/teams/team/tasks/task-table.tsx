'use client';
import { VisibilityState } from '@tanstack/react-table';
import { ITeamTask } from '@/core/types/interfaces';
import { TasksDataTable } from './tasks-data-table';
import { columns } from './columns';

export function TaskTable({
	currentItems,
	columnVisibility
}: Readonly<{ currentItems: ITeamTask[]; columnVisibility: VisibilityState }>) {
	return (
		<TasksDataTable
			columns={columns}
			columnVisibility={columnVisibility}
			className="border-none"
			data={currentItems}
		/>
	);
}
