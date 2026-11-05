import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
	VisibilityState
} from '@tanstack/react-table';
import { cn } from '@/core/lib/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
interface DataTableProps {
	columns: ColumnDef<TTask>[];
	data: TTask[];
	className?: string;
	columnVisibility: VisibilityState;
}

const ACTIONS_COLUMN_ID = 'actions';

/** The team tasks table. The caller owns the surface around it, so the pagination can share that surface. */
export function TasksDataTable({ columns, data, className, columnVisibility }: Readonly<DataTableProps>) {
	const t = useTranslations();
	const table = useReactTable({
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			columnVisibility
		},
		getRowId: (row) => row.id
	});
	const rows = table.getFilteredRowModel().rows;
	const hasRows = rows.length > 0;
	const visibleColumnCount = table.getVisibleLeafColumns().length;

	return (
		<div className={cn('w-full', className)}>
			<Table className="relative w-full">
				<TableHeader className="w-full">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup.headers.map((header) => {
								const isActionsColumn = header.column.id === ACTIONS_COLUMN_ID;
								return (
									<TableHead key={header.id} className={cn(isActionsColumn && 'w-16 text-right')}>
										{header.isPlaceholder
											? null
											: (flexRender(
													header.column.columnDef.header,
													header.getContext()
												) as ReactNode)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				{hasRows && (
					<TableBody className="w-full">
						{rows.map((row) => (
							<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="relative">
								{row.getVisibleCells().map((cell) => {
									const isActionsCell = cell.column.id === ACTIONS_COLUMN_ID;
									return (
										<TableCell
											className={cn('relative py-2', isActionsCell && 'text-right')}
											key={cell.id}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext()) as ReactNode}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				)}
				{!hasRows && (
					<TableBody>
						<TableRow className="hover:bg-transparent">
							<TableCell colSpan={visibleColumnCount} className="h-36 text-center">
								<div className="flex flex-col items-center justify-center gap-2">
									<svg
										className="size-10 text-muted-foreground"
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
									<p className="text-sm text-muted-foreground">{t('common.NO_DATA_TO_SHOW')}</p>
								</div>
							</TableCell>
						</TableRow>
					</TableBody>
				)}
			</Table>
		</div>
	);
}
