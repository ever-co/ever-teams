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
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { IProject } from '@/app/interfaces';
import { cn } from '@/lib/utils';
import { useTaskStatus } from '@/app/hooks';
import { useMemo } from 'react';
import moment from 'moment';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@components/ui/button';
import AvatarStack from '@components/shared/avatar-stack';
import { SpinnerLoader } from '@/lib/components';

export type ProjectTableDataType = {
	project: {
		name: IProject['name'];
		imageUrl: IProject['imageUrl'];
		color: IProject['color'];
	};
	status: IProject['status'];
	startDate: IProject['startDate'];
	endDate: IProject['endDate'];
	members: IProject['members'];
	managers: IProject['members'];
	teams: IProject['teams'];
};

/**
 * Renders a data table displaying projects.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {ProjectTableDataType[]} props.data - Array of data objects projects information.
 * @param {boolean} props.loading - Whether to show loading indicator when loading projects data.
 *
 * @returns {JSX.Element} A table showing projects information.
 *
 */

export function DataTableProject(props: { data: ProjectTableDataType[]; loading: boolean }) {
	const { data, loading } = props;
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const t = useTranslations();
	const { taskStatus } = useTaskStatus();

	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
		return new Map(taskStatus.map((status) => [status.name, status.color]));
	}, [taskStatus]);

	const columns: ColumnDef<ProjectTableDataType>[] = [
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
			accessorKey: 'project',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						{t('pages.projects.projectTitle.PLURAL')}
						<ArrowUpDown size={10} />
					</Button>
				);
			},
			cell: function ({ row }) {
				return (
					<div className="capitalize">
						<div className="flex items-center font-medium gap-2">
							<div
								style={{ backgroundColor: row.original?.project?.color }}
								className={cn(
									'w-10 h-10  border overflow-hidden flex items-center justify-center rounded-xl'
								)}
							>
								{!row.original?.project?.imageUrl ? (
									row.original?.project?.name?.substring(0, 2)
								) : (
									<Image
										alt={row.original?.project?.name ?? ''}
										height={40}
										width={40}
										className="w-full h-full"
										src={row.original?.project?.imageUrl}
									/>
								)}
							</div>
							<p>{row.original?.project?.name}</p>
						</div>
					</div>
				);
			}
		},
		{
			accessorKey: 'status',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						{t('common.STATUS')}
						<ArrowUpDown size={10} />
					</Button>
				);
			},
			cell: ({ row }) => {
				return (
					<div className="capitalize flex items-center">
						<div
							style={{ backgroundColor: statusColorsMap.get(row.original?.status) }}
							className="rounded px-4 py-1"
						>
							{row.original?.status}
						</div>
					</div>
				);
			}
		},
		{
			accessorKey: 'startDate',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						{t('common.START_DATE')}
						<ArrowUpDown size={10} />
					</Button>
				);
			},
			cell: ({ row }) => (
				<div className="">
					{row.original?.startDate && moment(row.original?.startDate).format('MMM. DD YYYY')}
				</div>
			)
		},
		{
			accessorKey: 'endDate',
			header: ({ column }) => {
				return (
					<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
						{t('common.END_DATE')}
						<ArrowUpDown size={10} />
					</Button>
				);
			},
			cell: ({ row }) => (
				<div className="">{row.original?.endDate && moment(row.original?.endDate).format('MMM. DD YYYY')}</div>
			)
		},
		{
			accessorKey: 'members',
			header: () => <div>{t('common.MEMBERS')}</div>,
			cell: ({ row }) => {
				const members =
					row.original?.members
						?.filter((el) => !el.isManager)
						?.map((el) => ({
							imageUrl: el?.employee?.user?.imageUrl,
							name: el?.employee?.fullName
						})) || [];

				return members?.length > 0 ? <AvatarStack avatars={members} /> : null;
			}
		},
		{
			accessorKey: 'teams',
			header: () => <div>{t('common.TEAMS')}</div>,
			cell: ({ row }) => {
				const teams =
					row.original?.teams?.map((el) => ({
						name: el?.name
					})) || [];

				return teams?.length > 0 ? <AvatarStack avatars={teams} /> : null;
			}
		},
		{
			accessorKey: 'managers',
			header: () => <div>{t('common.MANAGERS')}</div>,
			cell: ({ row }) => {
				const managers =
					row.original?.managers
						?.filter((el) => el.isManager)
						?.map((el) => ({
							imageUrl: el?.employee?.user?.imageUrl,
							name: el?.employee?.fullName
						})) || [];

				return managers?.length > 0 ? <AvatarStack avatars={managers} /> : null;
			}
		}
	];

	const table = useReactTable({
		data,
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

	React.useEffect(() => {
		console.log(loading);
	}, [loading]);

	return (
		<div className="w-full">
			{loading ? (
				<div className="w-full flex justify-center items-center">
					<SpinnerLoader />
				</div>
			) : table?.getRowModel()?.rows.length ? (
				<div className="rounded-md">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead className=" capitalize" key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
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
