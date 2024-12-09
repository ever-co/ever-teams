'use client';

import * as React from 'react';
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { formatIntegerToHour, formatTimeString } from '@/app/helpers';
import { ProgressBar } from '@/lib/components';

export type WeeklyLimitTableDataType = {
	indexValue: string;
	timeSpent: number;
	limit: number;
	percentageUsed: number;
	remaining: number;
};

/**
 * Renders a data table displaying weekly time limits and usage for team members.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {WeeklyLimitTableDataType[]} props.data - Array of data objects containing weekly time usage information.
 * @param {boolean} props.showHeader - If false, hide the header.
 *
 * @returns {JSX.Element} A table showing member-wise weekly time limits, usage, and remaining time.
 *
 */

export function DataTableWeeklyLimits(props: {
	data: WeeklyLimitTableDataType[];
	indexTitle: string;
	showHeader?: boolean;
}) {
	const { data, indexTitle, showHeader = true } = props;
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const t = useTranslations();

	const columns: ColumnDef<WeeklyLimitTableDataType>[] = [
		{
			id: 'select',
			header: ({ table }) => (
				<div className="">
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					/>
				</div>
			),
			cell: ({ row }) => (
				<div className="">
					<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} />
				</div>
			),
			enableSorting: false,
			enableHiding: false
		},
		{
			accessorKey: 'indexValue',
			header: () => <div className="">{indexTitle}</div>,
			cell: ({ row }) => <div className="capitalize">{row.getValue('indexValue')}</div>
		},
		{
			accessorKey: 'timeSpent',
			header: () => <div className="">{t('pages.timeLimitReport.TIME_SPENT')}</div>,
			cell: ({ row }) => (
				<div className="lowercase">
					{formatTimeString(formatIntegerToHour(Number(row.getValue('timeSpent')) / 3600))}
				</div>
			)
		},
		{
			accessorKey: 'limit',
			header: () => <div className="">{t('pages.timeLimitReport.LIMIT')}</div>,
			cell: ({ row }) => (
				<div className="lowercase">
					{formatTimeString(formatIntegerToHour(Number(row.getValue('limit')) / 3600))}
				</div>
			)
		},
		{
			accessorKey: 'percentageUsed',
			header: () => <div className="">{t('pages.timeLimitReport.PERCENTAGE_USED')}</div>,
			cell: ({ row }) => (
				<div className="lowercase flex gap-2 items-center">
					<ProgressBar
						width={'10rem'}
						progress={`${Number(row.getValue('percentageUsed')) < 100 ? Number(row.getValue('percentageUsed')).toFixed(2) : 100}%`}
					/>{' '}
					<span>{`${Number(row.getValue('percentageUsed')).toFixed(2)}%`}</span>
				</div>
			)
		},
		{
			accessorKey: 'remaining',
			header: () => <div className="">{t('pages.timeLimitReport.REMAINING')}</div>,
			cell: ({ row }) => (
				<div className="lowercase">
					{Number(row.getValue('percentageUsed')) > 100 && '-'}
					{formatTimeString(formatIntegerToHour(Number(row.getValue('remaining')) / 3600))}
				</div>
			)
		}
	];

	const table = useReactTable({
		data: data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection
		}
	});

	return (
		<div className="w-full">
			{table?.getRowModel()?.rows.length ? (
				<div className="rounded-md">
					<Table>
						{showHeader && (
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											return (
												<TableHead className=" capitalize" key={header.id}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
						)}

						<TableBody>
							{table?.getRowModel()?.rows.length ? (
								table?.getRowModel().rows.map((row) => (
									<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										{t('common.NO_RESULT')}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			) : (
				<div className="w-full h-12 flex items-center justify-center">
					<span>{t('common.NO_RESULT')}</span>
				</div>
			)}
		</div>
	);
}
