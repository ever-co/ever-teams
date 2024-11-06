'use client';
import { usePagination } from '@/app/hooks/features/usePagination';
import { columns } from './columns';
import { TasksDataTable } from './tasks-data-table';
import { useTeamTasks } from '@/app/hooks';
import { Paginate } from '@/lib/components';
import { ITeamTask } from '@/app/interfaces';

export function TaskTable() {
	const { tasks } = useTeamTasks();

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ITeamTask>(tasks);
	return (
		<div className="w-full flex flex-col min-h-full">
			<TasksDataTable columns={columns} className="border-none" data={currentItems} />

			<Paginate
				total={total}
				onPageChange={onPageChange}
				pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
				itemsPerPage={itemsPerPage}
				itemOffset={itemOffset}
				endOffset={endOffset}
				setItemsPerPage={setItemsPerPage}
				className="mt-auto"
			/>
		</div>
	);
}
