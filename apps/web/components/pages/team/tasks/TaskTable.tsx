'use client';
import { VisibilityState } from '@tanstack/react-table';
import { columns } from './columns';
import { TasksDataTable } from './tasks-data-table';
import { ITeamTask } from '@/app/interfaces';

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
