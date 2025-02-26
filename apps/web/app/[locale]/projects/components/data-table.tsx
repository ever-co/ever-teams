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
import { useModal, useTaskStatus } from '@/app/hooks';
import { Fragment, memo, useEffect, useMemo } from 'react';
import moment from 'moment';
import { Archive, ChevronDown, ChevronUp, Ellipsis, Eye, Pencil, Trash } from 'lucide-react';
import AvatarStack from '@components/shared/avatar-stack';
import { HorizontalSeparator, SpinnerLoader } from '@/lib/components';
import { PROJECTS_TABLE_VIEW_LAST_SORTING } from '@/app/constants';
import { Menu, Transition } from '@headlessui/react';
import { DeleteProjectConfirmModal } from '@/lib/features/project/delete-confirm-modal';

export type ProjectTableDataType = {
	project: {
		id: string;
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

export const DataTableProject = memo((props: { data: ProjectTableDataType[]; loading: boolean }) => {
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
			id: 'project',
			header: function Header({ column }) {
				const isSort = column.getIsSorted();

				return (
					<div
						className="flex items-center cursor-pointer  gap-2"
						onClick={() => {
							column.toggleSorting(undefined, true);
						}}
					>
						<span>{t('pages.projects.projectTitle.PLURAL')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
			enableSorting: true,
			enableMultiSort: true,
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.project.name;
				const b = rowB.original.project.name;

				if (a && b) {
					if (a.toLowerCase() < b.toLowerCase()) return -1;
					if (a.toLowerCase() > b.toLowerCase()) return 1;
				}
				return 0;
			},
			cell: function ({ row }) {
				return (
					<div className="">
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
			id: 'status',
			header: function Header({ column }) {
				const isSort = column.getIsSorted();

				return (
					<div
						className="flex items-center cursor-pointer  gap-2"
						onClick={() => column.toggleSorting(undefined, true)}
					>
						<span>{t('common.STATUS')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
			enableMultiSort: true,
			enableSorting: true,
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.status;
				const b = rowB.original.status;

				if (a && b) {
					if (a.toLowerCase() < b.toLowerCase()) return -1;
					if (a.toLowerCase() > b.toLowerCase()) return 1;
				}
				return 0;
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
			id: 'startDate',
			header: function Header({ column }) {
				const isSort = column.getIsSorted();

				return (
					<div
						className="flex items-center cursor-pointer  gap-2"
						onClick={() => {
							column.toggleSorting(undefined, true);
						}}
					>
						<span>{t('common.START_DATE')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
			enableSorting: true,
			enableMultiSort: true,
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.startDate ? moment(rowA.original.startDate).toDate() : new Date(0); // Default to epoch if no date
				const b = rowB.original.startDate ? moment(rowB.original.startDate).toDate() : new Date(0);

				return b.getTime() - a.getTime();
			},
			cell: ({ row }) => (
				<div className="">
					{row.original?.startDate && moment(row.original?.startDate).format('MMM. DD YYYY')}
				</div>
			)
		},
		{
			accessorKey: 'endDate',
			id: 'endDate',
			header: function Header({ column }) {
				const isSort = column.getIsSorted();

				return (
					<div
						className="flex items-center cursor-pointer  gap-2"
						onClick={() => column.toggleSorting(undefined, true)}
					>
						<span>{t('common.END_DATE')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
			enableSorting: true,
			enableMultiSort: true,
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.endDate ? moment(rowA.original.endDate).toDate() : new Date(0); // Default to epoch if no date
				const b = rowB.original.endDate ? moment(rowB.original.endDate).toDate() : new Date(0);

				return b.getTime() - a.getTime();
			},
			cell: ({ row }) => (
				<div className="">{row.original?.endDate && moment(row.original?.endDate).format('MMM. DD YYYY')}</div>
			)
		},

		{
			accessorKey: 'members',
			id: 'members',
			header: ({ column }) => {
				const isSort = column.getIsSorted();
				return (
					<div className="flex items-center cursor-pointer  gap-2">
						<span>{t('common.MEMBERS')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
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
			id: 'teams',
			header: ({ column }) => {
				const isSort = column.getIsSorted();
				return (
					<div className="flex items-center cursor-pointer  gap-2">
						<span>{t('common.TEAMS')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
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
			id: 'managers',
			header: ({ column }) => {
				const isSort = column.getIsSorted();
				return (
					<div className="flex items-center cursor-pointer  gap-2">
						<span>{t('common.MANAGERS')}</span>
						<div className="flex items-center flex-col">
							<ChevronUp
								size={15}
								className={cn('-mb-[.125rem]', isSort == 'asc' ? 'text-primary' : 'text-gray-300')}
							/>
							<ChevronDown
								size={15}
								className={cn('-mt-[.125rem]', isSort == 'desc' ? 'text-primary' : 'text-gray-300')}
							/>
						</div>
					</div>
				);
			},
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
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const {
					openModal: openDeleteConfirmModal,
					closeModal: closeDeleteConfirmModal,
					isOpen: isDeleteConfirmModalOpen
				} = useModal();

				return (
					<>
						<Menu as="div" className="relative inline-block text-left">
							<div>
								<Menu.Button>
									<Ellipsis />
								</Menu.Button>
							</div>
							<Transition
								as={Fragment}
								enter="transition ease-out duration-100"
								enterFrom="transform opacity-0 scale-95"
								enterTo="transform opacity-100 scale-100"
								leave="transition ease-in duration-75"
								leaveFrom="transform opacity-100 scale-100"
								leaveTo="transform opacity-0 scale-95"
							>
								<Menu.Items className="absolute z-[999] right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
									<div className="p-1 flex flex-col gap-1">
										<Menu.Item>
											{({ active }) => (
												<button
													className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
												>
													<Eye size={15} /> <span>{t('common.VIEW_INFO')}</span>
												</button>
											)}
										</Menu.Item>
										<Menu.Item>
											{({ active }) => (
												<button
													className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
												>
													<Pencil size={15} /> <span>{t('common.EDIT')}</span>
												</button>
											)}
										</Menu.Item>
										<Menu.Item>
											{({ active }) => (
												<button
													className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
												>
													<Archive size={15} /> <span>{t('common.ARCHIVE')}</span>
												</button>
											)}
										</Menu.Item>
										<HorizontalSeparator />
										<Menu.Item>
											{({ active }) => (
												<button
													onClick={openDeleteConfirmModal}
													className={`${active && 'bg-red-400/10'} gap-2 text-red-600 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
												>
													<Trash size={15} /> <span>{t('common.DELETE')}</span>
												</button>
											)}
										</Menu.Item>
									</div>
								</Menu.Items>
							</Transition>
						</Menu>
						<DeleteProjectConfirmModal
							key={row.original.project.id}
							projectId={row.original.project.id}
							open={isDeleteConfirmModalOpen}
							closeModal={closeDeleteConfirmModal}
						/>
					</>
				);
			},
			enableSorting: false,
			enableHiding: false
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

	useEffect(() => {
		try {
			const stored = localStorage.getItem(PROJECTS_TABLE_VIEW_LAST_SORTING);
			if (stored) {
				const lastSorting = JSON.parse(stored) as SortingState;
				setSorting(lastSorting);
			}
		} catch (error) {
			console.error('Failed to load sorting preferences:', error);
		}
	}, []);
	useEffect(() => {
		try {
			localStorage.setItem(PROJECTS_TABLE_VIEW_LAST_SORTING, JSON.stringify(sorting));
		} catch (error) {
			console.error('Failed to save sorting preferences:', error);
		}
	}, [sorting]);

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
});

DataTableProject.displayName = 'DataTableProject';
