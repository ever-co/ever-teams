'use client';

import * as React from 'react';
import {
	Column,
	ColumnDef,
	ColumnFiltersState,
	OnChangeFn,
	RowSelectionState,
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
import { AnimatedEmptyState } from '@components/ui/empty-state';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useModal, useTaskStatus } from '@/app/hooks';
import { memo, useEffect, useMemo } from 'react';
import moment from 'moment';
import { ChevronDown, ChevronUp, EyeOff, MoveDown, MoveUp, RotateCcw } from 'lucide-react';
import AvatarStack from '@components/shared/avatar-stack';
import { HorizontalSeparator } from '@/lib/components';
import { PROJECTS_TABLE_VIEW_LAST_SORTING } from '@/app/constants';
import { useTheme } from 'next-themes';
import { RestoreProjectModal } from '@/lib/features/project/restore-project-modal';
import { ProjectItemActions, ProjectViewDataType } from '..';
import { Menu, Transition } from '@headlessui/react';
import { ProjectListSkeleton } from './list-skeleton';

// Columns that can be hidden in the project table
export const hidableColumnNames = ['archivedAt', 'endDate', 'managers', 'members', 'teams'];

/**
 * Renders a data table displaying projects.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {ProjectTableDataType[]} props.data - Array of data objects projects information.
 * @param {boolean} props.loading - Whether to show loading indicator when loading projects data.
 * @param {VisibilityState} props.columnVisibility - Columns visibility state
 * @param {OnChangeFn<VisibilityState> | undefined} props.onColumnVisibilityChange - Function to call when column visibility state changes
 *
 * @returns {JSX.Element} A table showing projects information.
 *
 */

export const ProjectsTable = memo(
	(props: {
		data: ProjectViewDataType[];
		loading: boolean;
		columnVisibility: VisibilityState;
		selectedProjects: Record<string, boolean>;
		onSelectedProjectsChange?: OnChangeFn<RowSelectionState>;
		onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
	}) => {
		const {
			data,
			loading,
			columnVisibility,
			onColumnVisibilityChange,
			selectedProjects,
			onSelectedProjectsChange
		} = props;
		const [sorting, setSorting] = React.useState<SortingState>([]);
		const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
		const t = useTranslations();
		const { taskStatuses } = useTaskStatus();
		const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
			return new Map(taskStatuses.map((status) => [status.name, status.color]));
		}, [taskStatuses]);

		const columns: ColumnDef<ProjectViewDataType>[] = [
			{
				id: 'select',
				header: ({ table }) => (
					<div className="">
						<Checkbox
							checked={
								table.getIsAllPageRowsSelected() ||
								(table.getIsSomePageRowsSelected() && 'indeterminate')
							}
							onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="">
						<Checkbox
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(!!value)}
						/>
					</div>
				),
				enableSorting: false,
				enableHiding: false
			},
			{
				accessorKey: 'project',
				id: 'project',
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							sorting={{
								ascLabel: 'A-Z',
								descLabel: 'Z-A'
							}}
							column={{
								name: t('pages.projects.projectTitle.SINGULAR'),
								entity: column
							}}
						/>
					);
				},
				enableSorting: true,
				enableHiding: false,
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
					return (
						<ColumnHandlerDropdown
							sorting={{
								ascLabel: 'A-Z',
								descLabel: 'Z-A'
							}}
							column={{
								name: t('common.STATUS'),
								entity: column
							}}
						/>
					);
				},
				enableMultiSort: true,
				enableSorting: true,
				enableHiding: false,
				sortingFn: (rowA, rowB) => {
					const a = rowA.original.status;
					const b = rowB.original.status;

					if (a && b) {
						if (a.toLowerCase() < b.toLowerCase()) return -1;
						if (a.toLowerCase() > b.toLowerCase()) return 1;
					}
					return 0;
				},
				cell: function Cell({ row }) {
					const { resolvedTheme } = useTheme();

					return (
						<div className="capitalize flex items-center">
							<div
								style={{
									backgroundColor:
										resolvedTheme == 'light'
											? statusColorsMap.get(row.original?.status) ?? 'transparent'
											: '#6A7280'
								}}
								className="rounded text-xs px-4 py-1"
							>
								{row.original?.status}
							</div>
						</div>
					);
				}
			},
			{
				accessorKey: 'archivedAt',
				id: 'archivedAt',
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							sorting={{
								ascLabel: 'Newest',
								descLabel: 'Oldest'
							}}
							column={{
								name: t('common.ARCHIVE_AT'),
								entity: column
							}}
						/>
					);
				},
				enableSorting: true,
				enableHiding: true,
				enableMultiSort: true,
				sortingFn: (rowA, rowB) => {
					const a = rowA.original.startDate ? moment(rowA.original.archivedAt).toDate() : new Date(0); // Default to epoch if no date
					const b = rowB.original.startDate ? moment(rowB.original.archivedAt).toDate() : new Date(0);

					return b.getTime() - a.getTime();
				},
				cell: ({ row }) => (
					<div className="">
						{row.original?.archivedAt && moment(row.original?.archivedAt).format('MMM. DD YYYY')}
					</div>
				)
			},
			{
				accessorKey: 'startDate',
				id: 'startDate',
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							sorting={{
								ascLabel: 'Newest',
								descLabel: 'Oldest'
							}}
							column={{
								name: t('common.START_DATE'),
								entity: column
							}}
						/>
					);
				},
				enableSorting: true,
				enableMultiSort: true,
				enableHiding: false,
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
					return (
						<ColumnHandlerDropdown
							sorting={{
								ascLabel: 'Newest',
								descLabel: 'Oldest'
							}}
							column={{
								name: t('common.END_DATE'),
								entity: column
							}}
						/>
					);
				},
				enableSorting: true,
				enableMultiSort: true,
				enableHiding: true,
				sortingFn: (rowA, rowB) => {
					const a = rowA.original.endDate ? moment(rowA.original.endDate).toDate() : new Date(0); // Default to epoch if no date
					const b = rowB.original.endDate ? moment(rowB.original.endDate).toDate() : new Date(0);

					return b.getTime() - a.getTime();
				},
				cell: ({ row }) => (
					<div className="">
						{row.original?.endDate && moment(row.original?.endDate).format('MMM. DD YYYY')}
					</div>
				)
			},

			{
				accessorKey: 'members',
				id: 'members',
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							column={{
								name: t('common.MEMBERS'),
								entity: column
							}}
						/>
					);
				},
				enableHiding: true,
				enableSorting: false,
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
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							column={{
								name: t('common.TEAMS'),
								entity: column
							}}
						/>
					);
				},
				enableHiding: true,
				enableSorting: false,
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
				header: function Header({ column }) {
					return (
						<ColumnHandlerDropdown
							column={{
								name: t('common.MANAGERS'),
								entity: column
							}}
						/>
					);
				},
				enableHiding: true,
				enableSorting: false,
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
				cell: function Cell({ row }) {
					return <ProjectItemActions item={row.original} />;
				},
				enableHiding: false
			},
			{
				id: 'restore',
				cell: function Cell({ row }) {
					const {
						openModal: openRestoreProjectModal,
						closeModal: closeRestoreProjectModal,
						isOpen: isRestoreProjectModalOpen
					} = useModal();

					return (
						<>
							<button
								onClick={openRestoreProjectModal}
								className={` bg-[#E2E8F0] text-[#3E1DAD] gap-2 group flex items-center rounded-md px-2 py-2 text-xs`}
							>
								<RotateCcw size={15} /> <span>{t('common.RESTORE')}</span>
							</button>

							<RestoreProjectModal
								projectId={row.original?.project?.id}
								open={isRestoreProjectModalOpen}
								closeModal={closeRestoreProjectModal}
							/>
						</>
					);
				},
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
			onColumnVisibilityChange,
			onRowSelectionChange: onSelectedProjectsChange,
			state: {
				sorting,
				columnFilters,
				columnVisibility,
				rowSelection: selectedProjects
			},
			getRowId: (row) => row.project.id
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
					<ProjectListSkeleton />
				) : table?.getRowModel()?.rows.length ? (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											return (
												<TableHead className=" capitalize" key={header.id}>
													{header.isPlaceholder
														? null
														: (flexRender(
																header.column.columnDef.header,
																header.getContext()
															) as React.ReactNode)}
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
													{
														flexRender(
															cell.column.columnDef.cell,
															cell.getContext()
														) as React.ReactNode
													}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={columns.length} className="h-[600px]">
											<AnimatedEmptyState
												title="No Projects Yet"
												showBorder={false}
												message={
													<>
														<p>Ready to start something amazing?</p>
														<p className="text-sm text-gray-500 mt-1">
															Create your first project and begin collaborating with your
															team.
														</p>
													</>
												}
											/>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="w-full min-h-[600px] flex items-center justify-center">
						<AnimatedEmptyState
							title="No Projects Yet"
							showBorder={false}
							message={
								<div className="space-y-2">
									<h4 className="text-base font-medium">Ready to start something amazing?</h4>
									<p className="text-sm text-gray-500">
										Create your first project and begin collaborating with your team.
									</p>
								</div>
							}
						/>
					</div>
				)}
			</div>
		);
	}
);

ProjectsTable.displayName = 'ProjectsTable';

function ColumnHandlerDropdown(args: {
	column: { name: string; entity: Column<ProjectViewDataType> };
	sorting?: { ascLabel: string; descLabel: string };
}) {
	const { column, sorting } = args;

	const t = useTranslations();

	const isSort = column.entity.getIsSorted();

	return (
		<Menu as="div" className="relative inline-block text-left">
			<div>
				<Menu.Button>
					<div className="flex items-center cursor-pointer  gap-2">
						<span>{column.name}</span>
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
				</Menu.Button>
			</div>
			<Transition
				as="div"
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-36 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none">
					<div className="p-1 flex flex-col gap-1">
						{column.entity.getCanSort() && sorting && (
							<>
								<Menu.Item>
									{({ active }) => (
										<button
											onClick={() => column.entity.toggleSorting(false)}
											className={cn(
												`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`,
												isSort == 'asc' && 'bg-primary/10'
											)}
										>
											<MoveUp size={12} /> <span>{sorting.ascLabel}</span>
										</button>
									)}
								</Menu.Item>
								<Menu.Item>
									{({ active }) => (
										<button
											onClick={() => column.entity.toggleSorting(true)}
											className={cn(
												`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`,
												isSort == 'desc' && 'bg-primary/10'
											)}
										>
											<MoveDown size={12} /> <span>{sorting.descLabel}</span>
										</button>
									)}
								</Menu.Item>
							</>
						)}

						{column.entity.getCanHide() && (
							<>
								{sorting && <HorizontalSeparator className="border-t" />}

								<Menu.Item>
									{({ active }) => (
										<button
											onClick={column.entity.getToggleVisibilityHandler()}
											className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
										>
											<EyeOff size={12} /> <span>{t('common.HIDE')}</span>
										</button>
									)}
								</Menu.Item>
							</>
						)}
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
