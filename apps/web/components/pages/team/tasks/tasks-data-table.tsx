import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
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
	return (
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
							className="text-gray-500 size-10 dark:text-column.c500"
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
	);
}
