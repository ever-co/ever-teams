'use client';
import { columns } from './columns';
import { TasksDataTable } from './tasks-data-table';
import { ITeamTask } from '@/app/interfaces';

export function TaskTable({ currentItems }: Readonly<{ currentItems: ITeamTask[] }>) {
	return <TasksDataTable columns={columns} className="border-none" data={currentItems} />;
}
