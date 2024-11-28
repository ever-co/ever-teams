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
import { Tooltip } from 'lib/components';
import { clsxm } from '@app/utils';
import { cn } from '@/lib/utils';

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
}

function DataTable<TData, TValue>({
	columns,
	data,
	footerRows,
	isHeader,
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
			<Table className="w-full mt-0 border-transparent rounded-2xl">
				{isHeader && (
					<TableHeader className="">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow className="hover:bg-transparent h-[74px] border-none" key={headerGroup.id}>
								{headerGroup.headers.map((header, index) => {
									const tooltip: any = header.column.columnDef;
									const isTooltip: any = flexRender(tooltip.tooltip, header.getContext());
									return (
										<TableHead
											style={{
												textAlign: index === 0 ? 'left' : 'center'
											}}
											className="!w-40 text-base"
											key={header.id}
										>
											<Tooltip label={isTooltip as string} className="" enabled={!!isTooltip}>
												<div className="">
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</div>
											</Tooltip>
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
				)}
				<div className="mt-8"></div>
				<TableBody
					className={cn(
						'divide-y h-40 overflow-y-auto divide-gray-200 bg-light--theme-light dark:bg-dark--theme-light'
					)}
				>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row, i) => {
							return (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className={clsxm(
										'my-4 hover:bg-[#00000008] dark:hover:bg-[#26272C]/40',
										i == 1 && 'max-w-[615px]'
									)}
								>
									{row.getVisibleCells().map((cell, index) => {
										return (
											<TableCell
												key={cell.id}
												style={{
													textAlign: index === 0 ? 'left' : 'center',
													width: index === 4 ? '2rem' : '13rem'
												}}
												// className="!w-36"
												className={clsxm(
													'my-4 border-r border-b border-[#00000008] border-[0.125rem] dark:border-[#26272C]'
												)}
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										);
									})}
								</TableRow>
							);
						})
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								ß No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
				{footerRows && footerRows?.length > 0 && (
					<TableFooter className="bg-gray-50 dark:bg-gray-800">
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
