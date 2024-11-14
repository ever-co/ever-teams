import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { Button } from '@/components/ui/button';
import FilterButton from './FilterButton';
import StatusBadge from './StatusBadge';
import { ITaskStatus, ITeamTask } from '@/app/interfaces';
import { Input } from '@components/ui/input';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	className?: string;
}

export function TasksDataTable<TData, TValue>({ columns, data, className }: Readonly<DataTableProps<TData, TValue>>) {
	const table = useReactTable({
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});
	const tasks = data as ITeamTask[];
	const t = useTranslations();
	return (
		<>
			<div className="flex flex-col my-5 leading-snug">
				<div className="flex flex-wrap items-center justify-between w-full gap-10 py-2 max-md:max-w-full">
					<h1 className="self-stretch my-auto text-4xl font-medium tracking-tighter text-indigo-950 dark:text-gray-50">
						{t('sidebar.TEAMTASKS')}
					</h1>
					<nav className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium tracking-tight min-w-[240px] text-indigo-950 max-md:max-w-full">
						<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-medium text-slate-800">
							<div className="flex items-start self-stretch gap-1 my-auto">
								{Array.from(new Set(tasks.map((status) => status.status))).map((taskStatus, index) => (
									<StatusBadge
										key={index}
										color={getStatusColor(taskStatus)}
										label={taskStatus.split('-').join(' ')}
										count={tasks.filter((item) => item.status === taskStatus).length}
									/>
								))}
							</div>
						</div>
						<FilterButton table={table} />
						<div className="w-px h-6 bg-gray-200 dark:bg-gray-400" />
						<div className="flex gap-2.5 items-center relative min-w-[122px] text-muted-foreground border border-gray-200 dark:border-gray-400 rounded-md">
							<Search className="absolute w-4 h-4 left-3" />

							<Input
								placeholder="Search tasks..."
								value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
								onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
								className="max-w-sm pl-10 bg-transparent border-none dark:focus-visible:!border-[#c8c8c8] transition-all duration-200  placeholder:font-normal"
							/>
						</div>
						<Button className="text-[#B1AEBC]" variant="ghost" size="icon" aria-label="More options">
							<svg
								className="w-4 h-4"
								width={24}
								height={24}
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10Z"
									stroke="currentColor"
									strokeWidth="1.3"
								/>
								<path
									d="M19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10Z"
									stroke="currentColor"
									strokeWidth="1.3"
								/>
								<path
									d="M12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
									stroke="currentColor"
									strokeWidth="1.3"
								/>
							</svg>
						</Button>
					</nav>
				</div>
			</div>

			<div className={cn('rounded-md border', className)}>
				<Table className="relative w-full min-h-[150px]">
					<TableHeader className="border-b border-[#B1AEBC]/30 dark:border-gray-300/30 min-h-fit max-h-10 w-full">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					{table.getFilteredRowModel().rows.length ? (
						<TableBody className="w-full">
							{table.getFilteredRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className="relative border-none min-h-10"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell className="relative" key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					) : (
						<div className="absolute bottom-0 flex flex-col items-center justify-center flex-auto w-full h-24 min-w-full p-4 text-center -translate-x-1/2 left-1/2 md:p-5">
							<svg
								className="text-gray-500 size-10 dark:text-neutral-500"
								xmlns="http://www.w3.org/2000/svg"
								width={24}
								height={24}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={1}
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1={22} x2={2} y1={12} y2={12} />
								<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
								<line x1={6} x2="6.01" y1={16} y2={16} />
								<line x1={10} x2="10.01" y1={16} y2={16} />
							</svg>
							<p className="mt-2 text-sm text-gray-800 dark:text-neutral-300">No data to show</p>
						</div>
					)}
				</Table>
			</div>
		</>
	);
}

function getStatusColor(status: ITaskStatus) {
	switch (status) {
		case 'in-review':
			return 'bg-[#f3d8b0]';
		case 'backlog':
			return 'bg-[#ffcc00]';
		case 'open':
			return 'bg-[#d6e4f9]';
		case 'in-progress':
			return 'bg-[#ece8fc]';
		case 'ready-for-review':
			return 'bg-[#f5f1cb]';
		case 'blocked':
			return 'bg-[#f5b8b8]';
		case 'done':
			return 'bg-[#4caf50] text-gray-100';
		case 'completed':
			return 'bg-[#d4efdf]';
		case 'custom':
			return 'bg-[#d4efdf]';
		default:
			return 'bg-gray-100 text-gray-800';
	}
}
