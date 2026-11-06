import React from 'react';
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';

import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody, TableFooter } from './table';
import { clsxm } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { Tooltip } from '../duplicated-components/tooltip';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	footerRows?: React.ReactNode[];
	isError?: boolean;
	isHeader?: boolean;
	noResultsMessage?: {
		heading: string;
		content: string;
	};
	isScrollable?: boolean;
	/**
	 * Optional wrapper component for each row's cells.
	 * Used to provide shared context (e.g., shared hooks state) across cells in the same row.
	 * Receives the row data and children (the rendered cells).
	 */
	rowWrapper?: React.ComponentType<{ data: TData; children: React.ReactNode }>;
}

function DataTable<TData, TValue>({
	columns,
	data,
	footerRows,
	isHeader,
	noResultsMessage,
	rowWrapper: RowWrapper
}: Readonly<DataTableProps<TData, TValue>>) {
	const [rowSelection, setRowSelection] = React.useState({});
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = React.useState<SortingState>([]);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters
		},
		defaultColumn: {
			// Let's set up our default column filter UI
			size: 20
		},

		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
	});

	return (
		<>
			<Table className="mt-0 w-full">
				{isHeader && (
					<TableHeader className="">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow className="hover:bg-transparent" key={headerGroup.id}>
								{headerGroup.headers.map((header, index) => {
									const tooltip: any = header.column.columnDef;
									const isTooltip: any = flexRender(tooltip.tooltip, header.getContext());
									return (
										<TableHead
											style={{
												textAlign: index === 0 ? 'left' : 'center'
											}}
											className="!w-40"
											key={header.id}
										>
											<Tooltip label={isTooltip as string} className="" enabled={!!isTooltip}>
												<div className="">
													{header.isPlaceholder
														? null
														: (flexRender(
																header.column.columnDef.header,
																header.getContext()
															) as React.ReactNode)}
												</div>
											</Tooltip>
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
				)}
				<TableBody className={cn('overflow-y-auto min-h-28 bg-card')}>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row, i) => {
							const cells = row.getVisibleCells().map((cell, index) => {
								return (
									<TableCell
										key={cell.id}
										style={{
											textAlign: index === 0 ? 'left' : 'center',
											width: index === 4 ? '2rem' : '13rem'
										}}
										className={clsxm('my-4')}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext()) as React.ReactNode}
									</TableCell>
								);
							});

							return (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className={clsxm('my-4', i == 1 && 'max-w-[615px]')}
								>
									{RowWrapper ? <RowWrapper data={row.original}>{cells}</RowWrapper> : cells}
								</TableRow>
							);
						})
					) : (
						<TableRow className="hover:bg-transparent">
							<TableCell colSpan={columns.length} className="h-24 text-center">
								{noResultsMessage ? (
									<div className="flex flex-col items-center gap-1">
										<span className="text-sm font-medium text-foreground">
											{noResultsMessage.heading}
										</span>
										<span className="text-xs text-muted-foreground">
											{noResultsMessage.content}
										</span>
									</div>
								) : (
									<span className="text-sm text-muted-foreground">No results.</span>
								)}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
				{footerRows && footerRows?.length > 0 && (
					<TableFooter>
						{footerRows.map((row, index) => (
							<TableRow key={`footer-row-${index}}`}>{row}</TableRow>
						))}
					</TableFooter>
				)}
			</Table>
		</>
	);
}

export default DataTable;
