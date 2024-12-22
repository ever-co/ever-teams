'use client';

import * as React from 'react';
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';
import { ArrowUpDownIcon, MoreHorizontal } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '@components/ui/select';
import {
	MdKeyboardDoubleArrowLeft,
	MdKeyboardDoubleArrowRight,
	MdKeyboardArrowLeft,
	MdKeyboardArrowRight,
	MdKeyboardArrowUp,
	MdKeyboardArrowDown
} from 'react-icons/md';
import { ConfirmStatusChange, StatusBadge, statusOptions, dataSourceTimeSheet, TimeSheet } from '.';
import { useModal, useTimelogFilterOptions } from '@app/hooks';
import { Checkbox } from '@components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { clsxm } from '@/app/utils';
import { AlertConfirmationModal, statusColor } from '@/lib/components';
import { Badge } from '@components/ui/badge';
import {
	EditTaskModal,
	RejectSelectedModal,
	StatusAction,
	StatusType,
	EmployeeAvatar,
	getTimesheetButtons,
	statusTable,
	ProjectLogo
} from '@/app/[locale]/timesheet/[memberId]/components';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/app/helpers';
import { GroupedTimesheet, useTimesheet } from '@/app/hooks/features/useTimesheet';
import { DisplayTimeForTimesheet, TaskNameInfoDisplay, TotalDurationByDate, TotalTimeDisplay } from '../../task/task-displays';
import { IUser, TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { toast } from '@components/ui/use-toast';
import { ToastAction } from '@components/ui/toast';

export const columns: ColumnDef<TimeSheet>[] = [
	{
		enableHiding: false,
		id: 'select',
		size: 50,
		header: ({ table }) => (
			<div className="flex items-center gap-x-4">
				<Checkbox
					checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
				<span>Task</span>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center gap-x-4 w-full max-w-[640px]">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
				<span className="capitalize !text-sm break-words whitespace-break-spaces sm:text-base !truncate !overflow-hidden">
					{row.original.task}
				</span>
			</div>
		)
	},
	{
		accessorKey: 'name',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="w-full text-sm text-center sm:text-base"
			>
				Project
				<ArrowUpDownIcon className="w-4 h-4 ml-2" />
			</Button>
		),
		cell: ({ row }) => <TaskDetails description={row.original.description} name={row.original.name} />
	},
	{
		accessorKey: 'employee',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="flex items-center justify-center w-full text-sm font-medium text-center sm:w-96 sm:text-base"
			>
				<span>Employee</span>
				<ArrowUpDownIcon className="w-4 h-4 ml-2" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="w-full text-sm font-medium text-center sm:w-96 sm:text-base">
				<span> {row.original.employee}</span>
			</div>
		)
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				className="flex items-center justify-center w-full text-sm text-center  sm:w-auto sm:text-base"
			>
				<span>Status</span>
				<ArrowUpDownIcon className="w-4 h-4 ml-2" />
			</Button>
		),
		cell: ({ row }) => {
			return <StatusBadge selectedStatus={row.original.status} />;
		}
	},
	{
		accessorKey: 'time',
		header: () => <div className="w-full text-sm text-center sm:text-base">Time</div>,
		cell: ({ row }) => (
			<div
				className={`text-center font-sans w-full text-sm sm:text-base ${statusColor(row.original.status).text}`}
			>
				{row.original.time}
			</div>
		)
	}
];

export function DataTableTimeSheet({ data, user }: { data?: GroupedTimesheet[], user?: IUser | undefined }) {
	const modal = useModal();
	const alertConfirmationModal = useModal();
	const { isOpen, openModal, closeModal } = modal;
	const { isOpen: isOpenAlert, openModal: openAlertConfirmation, closeModal: closeAlertConfirmation } = alertConfirmationModal;

	const { deleteTaskTimesheet, loadingDeleteTimesheet, getStatusTimesheet, updateTimesheetStatus } = useTimesheet({});
	const { timesheetGroupByDays, handleSelectRowByStatusAndDate, handleSelectRowTimesheet, selectTimesheetId, setSelectTimesheetId, isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = isUserAllowedToAccess(user);


	const handleConfirm = () => {
		try {
			deleteTaskTimesheet({ logIds: selectTimesheetId })
				.then(() => {
					setSelectTimesheetId([]);
					closeAlertConfirmation()
				})
				.catch((error) => {
					console.error('Delete timesheet error:', error);
				});
		} catch (error) {
			console.error('Delete timesheet error:', error);
		}
	};

	const t = useTranslations();
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const table = useReactTable({
		data: dataSourceTimeSheet,
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
	const handleSort = (key: string, order: SortOrder) => {
		console.log(`Sorting ${key} in ${order} order`);
	};
	const handleButtonClick = async (action: StatusAction) => {
		switch (action) {
			case 'Approved':
				if (selectTimesheetId.length > 0) {
					await updateTimesheetStatus({
						status: 'APPROVED',
						ids: selectTimesheetId
					})
				}
				break;
			case 'Denied':
				openModal();
				break;
			case 'Deleted':
				openAlertConfirmation();
				break;
			default:
				console.error(`Unsupported action: ${action}`);
		}
	};

	return (
		<div className="w-full dark:bg-dark--theme">
			<AlertConfirmationModal
				description={t('common.IRREVERSIBLE_ACTION_WARNING')}
				close={closeAlertConfirmation}
				loading={loadingDeleteTimesheet}
				onAction={handleConfirm}
				open={isOpenAlert}
				title={t('common.DELETE_CONFIRMATION')}
				countID={selectTimesheetId.length}
			/>
			<RejectSelectedModal
				onReject={() => {
					// Pending implementation
				}}
				maxReasonLength={120}
				minReasonLength={0}
				closeModal={closeModal}
				isOpen={isOpen}
			/>
			<div className="rounded-md">
				{data?.map((plan, index) => {
					return <div key={index}>
						<div
							className={clsxm(
								'h-[48px] flex justify-between items-center w-full',
								'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border-1',
								'border-gray-400 px-5 text-[#71717A] font-medium'
							)}>
							<div className='flex gap-x-3'>
								{timesheetGroupByDays === 'Weekly' && (
									<span>Week {index + 1}</span>
								)}
								<span>{formatDate(plan.date)}</span>
							</div>
							<TotalDurationByDate
								timesheetLog={plan.tasks}
								createdAt={formatDate(plan.date)}
							/>
						</div>
						<Accordion type="single" collapsible>
							{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
								return rows.length > 0 && status && <AccordionItem
									key={status}
									value={status === 'DENIED' ? 'REJECTED' : status}
									className={clsxm("p-1 rounded")}
								>
									<AccordionTrigger
										style={{ backgroundColor: statusColor(status).bgOpacity }}
										type="button"
										className={clsxm(
											'flex flex-row-reverse justify-end items-center w-full h-[50px] rounded-sm gap-x-2 hover:no-underline px-2',
											statusColor(status).text
										)}
									>
										<div className="flex items-center justify-between w-full space-x-1">
											<div className="flex items-center space-x-1">
												<div className={clsxm('p-2 rounded-[3px] gap-2 w-[20px] h-[20px]', statusColor(status).bg)}></div>
												<div className="flex items-center gap-x-1">
													<span className="text-base font-normal text-gray-400 uppercase">
														{status === 'DENIED' ? 'REJECTED' : status}
													</span>
													<span className="text-gray-400 text-[14px]">({rows.length})</span>
												</div>
												<Badge
													variant={'outline'}
													className="box-border flex flex-row items-center px-2 py-1 gap-2 w-[108px] h-[30px] bg-[rgba(247,247,247,0.6)] border border-gray-300 rounded-lg flex-none order-1 flex-grow-0"
												>
													<span className="text-[#5f5f61] text-[14px] font-[700px]">{t('timer.TOTAL_HOURS').split(' ')[0]}:</span>
													<TotalTimeDisplay timesheetLog={rows} className='!text-[#293241] text-[14px]' />
												</Badge>
											</div>
											<div className={clsxm('flex items-center gap-2 p-x-1 capitalize')}>
												{isManage && getTimesheetButtons(status as StatusType, t, selectTimesheetId.length === 0, handleButtonClick)}
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="flex flex-col w-full">
										<HeaderRow
											handleSelectRowByStatusAndDate={
												() => handleSelectRowByStatusAndDate(rows, selectTimesheetId.length === 0)}
											data={rows}
											status={status}
											onSort={handleSort}
											date={plan.date}
										/>
										{rows.map((task) => (
											<div
												key={task.id}
												style={{
													backgroundColor: statusColor(status).bgOpacity,
													borderBottomColor: statusColor(status).bg
												}}
												className={clsxm(
													'flex items-center border-b border-b-gray-200 dark:border-b-gray-600 space-x-4 p-1 h-[60px]'
												)}
											>
												<Checkbox
													className="w-5 h-5 select-auto"
													onCheckedChange={() => handleSelectRowTimesheet(task.id)}
													checked={selectTimesheetId.includes(task.id)}
												/>
												<div className="flex-[2]">
													<TaskNameInfoDisplay
														task={task.task}
														className={clsxm(
															'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
														)}
														taskTitleClassName={clsxm(
															'text-sm text-ellipsis overflow-hidden '
														)}
														showSize={true}
														dash
														taskNumberClassName="text-sm"
													/>
												</div>
												<div className="flex items-center gap-2 flex-1">
													{task.project?.imageUrl && <ProjectLogo className='w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-[8px]' imageUrl={task.project.imageUrl} />}
													<span className="font-medium">{task.project?.name}</span>
												</div>
												<div className="flex items-center flex-1 gap-x-2">
													<EmployeeAvatar
														className='w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-full'
														imageUrl={task.employee.user.imageUrl!}
													/>
													<span className="flex-1 font-medium">{task.employee.fullName}</span>
												</div>
												<div className="flex-1">
													<Badge
														className={`${getBadgeColor(task.timesheet.status as TimesheetStatus)}  rounded-md py-1 px-2 text-center font-medium text-black`}
													>
														{task.timesheet.status === 'DENIED' ? 'REJECTED' : task.timesheet.status}
													</Badge>
												</div>
												<DisplayTimeForTimesheet
													timesheetLog={task}
													logType={task.logType}
												/>
												<TaskActionMenu
													dataTimesheet={task}
													isManage={isManage}
													user={user} />
											</div>
										))}
									</AccordionContent>
								</AccordionItem>
							}
							)}
						</Accordion>
					</div>
				}
				)}
			</div>
			<div className="flex items-center justify-end p-4 space-x-2">
				<div className="flex-1 text-sm text-muted-foreground">
					{table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{' '}
					row(s) selected.
				</div>
				<div className="flex items-center gap-x-3">
					<span className="text-sm font-medium">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<Button
						variant={'outline'}
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<MdKeyboardDoubleArrowLeft />
					</Button>
					<Button
						variant={'outline'}
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<MdKeyboardArrowLeft />
					</Button>
					<Button variant={'outline'} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
						<MdKeyboardArrowRight />
					</Button>
					<Button
						variant={'outline'}
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<MdKeyboardDoubleArrowRight />
					</Button>
				</div>
			</div>
		</div >
	);
}

export function SelectFilter({ selectedStatus }: { selectedStatus?: string }) {
	const { isOpen, closeModal, openModal } = useModal();
	const [selected] = React.useState(selectedStatus);
	const [newStatus, setNewStatus] = React.useState('');
	const t = useTranslations();

	const getColorClass = () => {
		switch (selected) {
			case 'Rejected':
				return 'text-red-500 border-gray-200';
			case 'Approved':
				return 'text-green-500 border-gray-200';
			case 'Pending':
				return 'text-orange-500 border-gray-200';
			default:
				return 'text-gray-500 border-gray-200';
		}
	};

	const onValueChanges = (value: string) => {
		setNewStatus(value);
		openModal();
	};

	return (
		<>
			<ConfirmStatusChange closeModal={closeModal} isOpen={isOpen} oldStatus={selected} newStatus={newStatus} />

			<Select value={selected} onValueChange={(value) => onValueChanges(value)}>
				<SelectTrigger
					className={`min-w-[120px] w-fit border border-gray-200 h-8 dark:border-gray-700 bg-transparent font-normal rounded-md ${getColorClass()}`}
				>
					<SelectValue placeholder="Select a daily" className={getColorClass()} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup className="rounded">
						<SelectLabel>{t('common.STATUS')}</SelectLabel>
						{statusOptions.map((option, index) => (
							<div key={option.value}>
								<SelectItem value={option.value}>{option.label}</SelectItem>
								{index < statusOptions.length - 1 && (
									<div className="w-full border border-gray-100 dark:border-gray-700"></div>
								)}
							</div>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</>
	);
}

const TaskActionMenu = ({ dataTimesheet, isManage, user }: { dataTimesheet: TimesheetLog, isManage?: boolean, user?: IUser | undefined }) => {
	const { isOpen: isEditTask, openModal: isOpenModalEditTask, closeModal: isCloseModalEditTask } = useModal();
	const { isOpen: isOpenAlert, openModal: openAlertConfirmation, closeModal: closeAlertConfirmation } = useModal();
	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useTimesheet({});
	const canEdit = isManage || user?.id === dataTimesheet.employee.user.id;

	const t = useTranslations();
	const handleDeleteTask = () => {
		deleteTaskTimesheet({ logIds: [dataTimesheet.id] })
			.then(() => {
				toast({
					title: 'Deletion Confirmed',
					description: "The timesheet has been successfully deleted.",
					variant: 'default',
					className: 'bg-red-50 text-red-600 border-red-500',
					action: <ToastAction altText="Restore timesheet">Undo</ToastAction>
				});
			})
			.catch((error) => {
				toast({
					title: 'Error during deletion',
					description: `An error occurred: ${error}.The timesheet could not be deleted.`,
					variant: 'destructive',
					className: 'bg-red-50 text-red-600 border-red-500'
				});
			});
	};

	return (
		<>
			<AlertConfirmationModal
				description={t('common.IRREVERSIBLE_ACTION_WARNING')}
				close={closeAlertConfirmation}
				loading={loadingDeleteTimesheet}
				onAction={handleDeleteTask}
				open={isOpenAlert}
				title={t('common.DELETE_CONFIRMATION')}
			/>
			<EditTaskModal
				closeModal={isCloseModalEditTask}
				isOpen={isEditTask}
				dataTimesheet={dataTimesheet}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="w-8 h-8 p-0 text-sm sm:text-base">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="w-4 h-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{canEdit && (
						<DropdownMenuItem className="cursor-pointer" onClick={isOpenModalEditTask}>
							{t('common.EDIT')}
						</DropdownMenuItem>
					)
					}
					<DropdownMenuSeparator />
					<StatusTask timesheet={dataTimesheet} />
					<DropdownMenuItem
						onClick={openAlertConfirmation}
						className="text-red-600 hover:!text-red-600 cursor-pointer"
					>
						{t('common.DELETE')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};


const TaskDetails = ({ description, name }: { description: string; name: string }) => {
	return (
		<div className="flex items-center w-40 gap-x-2 ">
			<div className="flex items-center justify-center w-8 h-8 p-2 text-white rounded-lg shadow bg-primary dark:bg-primary-light">
				<span className="lowercase font-medium text-[10px]">ever</span>
			</div>
			<span className="capitalize font-medium !text-sm sm:text-base text-gray-800 dark:text-white leading-4 whitespace-nowrap">
				{name}
			</span>
			<div style={{ display: 'none' }}>{description}</div>
		</div>
	);
};

export const StatusTask = ({ timesheet }: { timesheet: TimesheetLog }) => {
	const t = useTranslations();
	const { updateTimesheetStatus, updateTimesheet } = useTimesheet({});
	const handleUpdateTimesheet = async (isBillable: boolean) => {
		await updateTimesheet({
			id: timesheet.timesheetId,
			isBillable: isBillable,
			employeeId: timesheet.employeeId,
			logType: timesheet.logType,
			source: timesheet.source,
			stoppedAt: timesheet.stoppedAt,
			startedAt: timesheet.startedAt,
			tenantId: timesheet.tenantId,
			organizationId: timesheet.organizationId,
			description: timesheet.description,
			projectId: timesheet.projectId,
			reason: timesheet.reason,
		});
	};

	return (
		<>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<span>{t('common.CHANGE_STATUS')}</span>
				</DropdownMenuSubTrigger>
				<DropdownMenuPortal>
					<DropdownMenuSubContent>
						{statusTable?.map((status, index) => (
							<DropdownMenuItem onClick={async () => {
								try {
									await updateTimesheetStatus({
										status: status.label as TimesheetStatus,
										ids: [timesheet.timesheet.id]
									});
								} catch (error) {
									console.error('Failed to update timesheet status:');
								}
							}} key={index} textValue={status.label} className="cursor-pointer">
								<div className="flex items-center gap-3">
									<div className={clsxm('h-2 w-2 rounded-full', statusColor(status.label).bg)}></div>
									<span>{status.label}</span>
								</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuPortal>
			</DropdownMenuSub>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<span>{t('pages.timesheet.BILLABLE.BILLABLE')}</span>
				</DropdownMenuSubTrigger>
				<DropdownMenuPortal>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={async () => {
							await handleUpdateTimesheet(true)
						}} textValue={'Yes'} className="cursor-pointer">
							<div className="flex items-center gap-3">
								<span>{t('pages.timesheet.BILLABLE.YES')}</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={async () => {
							await handleUpdateTimesheet(false)
						}} textValue={'No'} className="cursor-pointer">
							<div className="flex items-center gap-3">
								<span>{t('pages.timesheet.BILLABLE.NO')}</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuPortal>
			</DropdownMenuSub>
		</>
	);
};

export const getBadgeColor = (timesheetStatus: TimesheetStatus | null) => {
	switch (timesheetStatus) {
		case 'DRAFT':
			return 'bg-gray-300';
		case 'PENDING':
			return 'bg-yellow-400';
		case 'IN REVIEW':
			return 'bg-blue-500';
		case 'DENIED':
			return 'bg-red-500';
		case 'APPROVED':
			return 'bg-green-500';
		default:
			return 'bg-gray-100';
	}
};


type SortOrder = "ASC" | "DESC";

const HeaderColumn = ({
	label,
	onSort,
	currentSort,
}: {
	label: string;
	onSort: () => void;
	currentSort: SortOrder | null;
}) => (
	<div className="flex gap-x-2" role="columnheader">
		<span>{label}</span>
		<button
			onClick={onSort}
			aria-label={`Sort ${label} column ${currentSort ? `currently ${currentSort.toLowerCase()}` : ''}`}
			className="flex flex-col items-start leading-none gap-0"
		>
			<MdKeyboardArrowUp
				style={{
					height: 10,
					color: "#71717A",
				}}
			/>
			<MdKeyboardArrowDown
				style={{
					height: 10,
					color: "#71717A",
				}}
			/>
		</button>
	</div>
);

const HeaderRow = ({
	status,
	onSort,
	data,
	handleSelectRowByStatusAndDate, date
}: {
	status: string;
	onSort: (key: string, order: SortOrder) => void,
	data: TimesheetLog[],
	handleSelectRowByStatusAndDate: (status: string, date: string) => void,
	date?: string
}) => {

	const { bg, bgOpacity } = statusColor(status);
	const [sortState, setSortState] = React.useState<{ [key: string]: SortOrder | null }>({
		Task: null,
		Project: null,
		Employee: null,
		Status: null,
	});

	const handleSort = (key: string) => {
		const newOrder = sortState[key] === "ASC" ? "DESC" : "ASC";
		setSortState({ ...sortState, [key]: newOrder });
		onSort(key, newOrder);
	};

	return (
		<div
			style={{ backgroundColor: bgOpacity, borderBottomColor: bg }}
			className="flex items-center text-[#71717A] font-medium border-b border-t dark:border-gray-600 space-x-4 p-1 h-[60px] w-full"
		>
			<Checkbox
				onCheckedChange={() => date && handleSelectRowByStatusAndDate(status, date)}
				className="w-5 h-5"
				disabled={!date}
			/>
			<div className="flex-[2]">
				<HeaderColumn
					label="Task"
					onSort={() => handleSort("Task")}
					currentSort={sortState["Task"]}
				/>
			</div>
			<div className="flex-1">
				<HeaderColumn
					label="Project"
					onSort={() => handleSort("Project")}
					currentSort={sortState["Project"]}
				/>
			</div>
			<div className="flex-1">
				<HeaderColumn
					label="Employee"
					onSort={() => handleSort("Employee")}
					currentSort={sortState["Employee"]}
				/>
			</div>
			<div className="flex-auto">
				<HeaderColumn
					label="Status"
					onSort={() => handleSort("Status")}
					currentSort={sortState["Status"]}
				/>
			</div>
			<div className="space-x-2">
				<span>Time</span>
			</div>
		</div>
	);
};
