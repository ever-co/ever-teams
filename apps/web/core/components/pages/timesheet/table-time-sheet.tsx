'use client';
import * as React from 'react';
import { Check, CheckCircle2, DollarCircle, MoreHorizontal, Pencil, Trash, X } from '@/core/components/icons';
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub
} from '@/core/components/common/dropdown-menu';
import { SelectContent } from '@/core/components/common/select';
import { ConfirmStatusChange, statusOptions } from '../../integration/calendar';
import { useModal, useTimelogFilterOptions } from '@/core/hooks';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { clsxm } from '@/core/lib/utils';
import { AlertConfirmationModal } from '@/core/components';
import { badgeVariants } from '@/core/components/common/badge';
import {
	EditTaskModal,
	RejectSelectedModal,
	StatusAction,
	StatusType,
	EmployeeAvatar,
	getTimesheetButtons,
	statusTable,
	ProjectLogo
} from '@/core/components/timesheet';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/core/lib/helpers/index';
import type { GroupedTimesheet } from '@/core/lib/helpers/timesheet-grouping';
import { getStatusTimesheet, groupedByTimesheetIds } from '@/core/lib/helpers/timesheet-grouping';
import { useDeleteTimesheet } from '@/core/hooks/timesheet/use-delete-timesheet';
import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { useTimesheetReview } from '@/core/hooks/timesheet/use-timesheet-review';
import {
	DisplayTimeForTimesheet,
	TaskNameInfoDisplay,
	TotalDurationByDate,
	TotalTimeDisplay
} from '../../tasks/task-displays';
import { TUser } from '@/core/types/schemas';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { toast as sonnerToast } from 'sonner';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { Button } from '@/core/components/common/button';
import { Checkbox } from '@/core/components/common/checkbox';
import {
	Select,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import {
	DropdownMenu,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	DropdownMenuSeparator
} from '@/core/components/common/dropdown-menu';
import { CaretDownIcon, CaretUpIcon } from '@radix-ui/react-icons';
import { ETimeFrequency } from '@/core/types/generics/enums/date';
import moment from 'moment';
import { useUpdateTimeLogMutation } from '@/core/hooks/timesheet';
import { TimesheetStatusBadge, TimesheetTotalBadge } from '../../timesheet/timesheet-status-badge';
import {
	timesheetStatusDotClass,
	timesheetStatusLabel,
	timesheetStatusTone
} from '../../timesheet/timesheet-status-tone';

export function DataTableTimeSheet({ data, user }: { data?: GroupedTimesheet[]; user?: TUser | null }) {
	const accordionRef = React.useRef(null);
	const modal = useModal();
	const alertConfirmationModal = useModal();
	const { isOpen, openModal, closeModal } = modal;
	const {
		isOpen: isOpenAlert,
		openModal: openAlertConfirmation,
		closeModal: closeAlertConfirmation
	} = alertConfirmationModal;

	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useDeleteTimesheet();
	const { updateTimesheetStatus } = useUpdateTimesheet();
	const {
		timesheetGroupByDays,
		handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet,
		selectTimesheetId,
		setSelectTimesheetId,
		isUserAllowedToAccess
	} = useTimelogFilterOptions();
	const isManage = isUserAllowedToAccess(user);
	// isManage also covers MANAGER, but approve and reject call PUT /timesheet/status, which takes them from an
	// approver, or from a manager of a team of every member whose timesheet they move
	const { canApproveAnyTimesheet, canApproveAndReject } = useTimesheetReview();
	const handleConfirm = () => {
		try {
			deleteTaskTimesheet({
				logIds: selectTimesheetId?.map((select) => select.id).filter((id) => id !== undefined)
			})
				.then(() => {
					setSelectTimesheetId([]);
					closeAlertConfirmation();
				})
				.catch((error) => {
					console.error('Delete timesheet error:', error);
				});
		} catch (error) {
			console.error('Delete timesheet error:', error);
		}
	};

	const t = useTranslations();
	// The header carets sort the rows of every status group by the chosen column
	const [sort, setSort] = React.useState<{ key: string; order: SortOrder } | null>(null);
	const handleSort = (key: string, order: SortOrder) => {
		setSort({ key, order });
	};
	const sortValue = (log: ITimeLog, key: string): string => {
		switch (key) {
			case 'Task':
				return log.task?.title ?? '';
			case 'Project':
				return log.project?.name ?? '';
			case 'Employee':
				return log.employee?.fullName ?? '';
			case 'Status':
				return log.timesheet?.status ?? '';
			default:
				return '';
		}
	};
	// Rows keep their identity, so the selection (selectTimesheetId.includes(row)) still matches
	const sortRows = (rows: ITimeLog[]): ITimeLog[] =>
		!sort
			? rows
			: [...rows].sort((a, b) => {
					const result = sortValue(a, sort.key).localeCompare(sortValue(b, sort.key), undefined, {
						numeric: true,
						sensitivity: 'base'
					});
					return sort.order === 'ASC' ? result : -result;
				});
	const handleButtonClick = async (action: StatusAction) => {
		switch (action) {
			case 'Approved':
				if (selectTimesheetId.length > 0) {
					updateTimesheetStatus({
						status: ETimesheetStatus.APPROVED,
						ids: selectTimesheetId
							.map((select) => select.timesheetId || '')
							.filter((timesheetId) => timesheetId !== undefined)
					})
						.then(() => setSelectTimesheetId([]))
						.catch((error) => console.error(error));
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
		<div className="w-full">
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
				selectTimesheetId={selectTimesheetId
					.map((select) => select.timesheetId || '')
					.filter((timesheetId) => timesheetId !== undefined)}
				onReject={() => setSelectTimesheetId([])}
				maxReasonLength={120}
				minReasonLength={0}
				closeModal={closeModal}
				isOpen={isOpen}
			/>
			<div className="hairline-divide-y divide-border">
				{data?.map((plan, index) => {
					const groupTitle =
						timesheetGroupByDays === ETimeFrequency.MONTHLY
							? moment(plan.date).format('MMM YYYY')
							: formatDate(plan.date);
					return (
						<div key={index}>
							<div
								className={clsxm(
									'flex h-10 w-full items-center justify-between gap-3 px-4',
									'bg-foreground/2.5 text-sm font-medium text-foreground'
								)}
							>
								<div className="flex gap-x-3">
									{timesheetGroupByDays === 'Weekly' && <span>Week {index + 1}</span>}
									<span>{groupTitle}</span>
								</div>
								<TotalDurationByDate
									timesheetLog={plan.tasks}
									createdAt={formatDate(plan.date)}
									className="tabular-nums text-foreground"
								/>
							</div>
							<Accordion type="single" collapsible ref={accordionRef}>
								{Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => {
									const groupedByTimesheetId = groupedByTimesheetIds({ rows });

									return Object.entries(groupedByTimesheetId).map(([timesheetId, timesheetRows]) => {
										// The buttons act on the whole selection, so its timesheets are checked too
										const reviewedLogs = [...timesheetRows, ...selectTimesheetId];
										const canUpdateTimeSheetStatus = canApproveAndReject(reviewedLogs);
										// The managing roles keep their buttons, and a team manager
										// outside them gets approve and reject only
										const reviewsAsTeamManager =
											canUpdateTimeSheetStatus && !canApproveAnyTimesheet;
										const showsGroupButtons = isManage || reviewsAsTeamManager;
										return (
											timesheetRows.length > 0 &&
											status && (
												<AccordionItem
													key={`${status}-${timesheetId}`}
													value={`${status === 'DENIED' ? 'REJECTED' : status}-${timesheetId}`}
													className="hairline-t border-b-0 border-border"
												>
													<AccordionTrigger
														key={plan.date}
														type="button"
														className={clsxm(
															'flex h-11 w-full flex-row-reverse items-center justify-end gap-x-2 px-4 py-0',
															'text-muted-foreground transition-colors hover:bg-foreground/2.5 hover:no-underline'
														)}
													>
														<div className="flex w-full items-center justify-between gap-3">
															<div className="flex items-center gap-2">
																<TimesheetStatusBadge status={status}>
																	<span>{timesheetStatusLabel(status)}</span>
																	<span className="tabular-nums">
																		({timesheetRows.length})
																	</span>
																</TimesheetStatusBadge>
																<TimesheetTotalBadge
																	label={<>{t('timer.TOTAL_HOURS').split(' ')[0]}:</>}
																>
																	<TotalTimeDisplay
																		timesheetLog={timesheetRows}
																		className="text-foreground"
																	/>
																</TimesheetTotalBadge>
															</div>
															<div className="flex items-center gap-1">
																{showsGroupButtons &&
																	getTimesheetButtons(
																		status as StatusType,
																		t,
																		selectTimesheetId.length === 0,
																		handleButtonClick,
																		canUpdateTimeSheetStatus,
																		isManage
																	)}
															</div>
														</div>
													</AccordionTrigger>
													<AccordionContent className="flex w-full flex-col pb-0">
														{status === ETimesheetStatus.DENIED &&
															timesheetRows[0].timesheet?.reason && (
																<p className="hairline-t border-border px-4 py-3 text-sm text-muted-foreground whitespace-pre-line break-words">
																	<span className="font-medium text-foreground">
																		{t('pages.timesheet.REJECTION_REASON')}:
																	</span>{' '}
																	{timesheetRows[0].timesheet.reason}
																</p>
															)}
														<HeaderRow
															handleSelectRowByStatusAndDate={() =>
																handleSelectRowByStatusAndDate(
																	timesheetRows,
																	!timesheetRows.every((row) =>
																		selectTimesheetId.includes(row)
																	)
																)
															}
															data={timesheetRows}
															status={status}
															onSort={handleSort}
															date={plan.date}
															selectedIds={selectTimesheetId}
														/>
														{sortRows(timesheetRows).map((task) => (
															<div
																key={task.id}
																className={clsxm(
																	'flex min-h-14 items-center gap-4 hairline-t border-border px-4 py-2',
																	'transition-colors hover:bg-foreground/2.5',
																	selectTimesheetId.includes(task) && 'bg-primary/5'
																)}
															>
																<Checkbox
																	className="select-auto"
																	onCheckedChange={() =>
																		handleSelectRowTimesheet(task)
																	}
																	checked={selectTimesheetId.includes(task)}
																/>
																<div className="min-w-0 flex-2">
																	<TaskNameInfoDisplay
																		task={task.task}
																		className="min-w-0"
																		taskTitleClassName="text-sm text-foreground"
																		showSize={true}
																		dash
																		taskNumberClassName="text-sm text-muted-foreground"
																	/>
																</div>
																<div className="flex min-w-0 flex-1 items-center gap-2">
																	{task.project?.imageUrl && (
																		<ProjectLogo
																			className="size-7 rounded-md object-cover hairline-ring ring-border"
																			imageUrl={task.project.imageUrl}
																		/>
																	)}
																	<span className="truncate text-sm">
																		{task.project?.name ?? 'No Project'}
																	</span>
																</div>
																<div className="flex min-w-0 flex-1 items-center gap-x-2">
																	<EmployeeAvatar
																		className="size-7 rounded-full object-cover hairline-ring ring-border"
																		imageUrl={task.employee?.user.imageUrl!}
																	/>
																	<span className="flex-1 truncate text-sm font-medium">
																		{task.employee?.fullName}
																	</span>
																</div>
																<div className="flex-1">
																	<TimesheetStatusBadge
																		status={task.timesheet?.status}
																	>
																		{timesheetStatusLabel(task.timesheet?.status)}
																	</TimesheetStatusBadge>
																</div>
																<div className="flex w-24 shrink-0 justify-end tabular-nums">
																	<DisplayTimeForTimesheet
																		timesheetLog={task}
																		logType={
																			task.logType
																				? ETimeLogType[task.logType]
																				: ETimeLogType.TRACKED
																		}
																	/>
																</div>
																<TaskActionMenu
																	timeLog={task}
																	isManage={isManage}
																	user={user}
																/>
															</div>
														))}
													</AccordionContent>
												</AccordionItem>
											)
										);
									});
								})}
							</Accordion>
						</div>
					);
				})}
			</div>
		</div>
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
				return 'text-destructive-ink';
			case 'Approved':
				return 'text-success-foreground';
			case 'Pending':
				return 'text-warning-foreground';
			default:
				return 'text-muted-foreground';
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
				<SelectTrigger className={clsxm('h-8 min-w-[120px] w-fit font-normal', getColorClass())}>
					<SelectValue placeholder="Select a daily" className={getColorClass()} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup className="rounded">
						<SelectLabel>{t('common.STATUS')}</SelectLabel>
						{statusOptions.map((option, index) => (
							<div key={option.value}>
								<SelectItem value={option.value}>{option.label}</SelectItem>
								{index < statusOptions.length - 1 && <div className="-mx-1 my-1 h-px bg-border"></div>}
							</div>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</>
	);
}

const TaskActionMenu = ({
	timeLog,
	isManage,
	user
}: {
	timeLog: ITimeLog;
	isManage?: boolean | null;
	user?: TUser | null;
}) => {
	const { isOpen: isEditTask, openModal: isOpenModalEditTask, closeModal: isCloseModalEditTask } = useModal();
	const { isOpen: isOpenAlert, openModal: openAlertConfirmation, closeModal: closeAlertConfirmation } = useModal();
	const { isOpen: isRejectOpen, openModal: openRejectModal, closeModal: closeRejectModal } = useModal();
	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useDeleteTimesheet();
	const canEdit = isManage || user?.id === timeLog.employee?.user.id;

	const t = useTranslations();
	const handleDeleteTimeLog = async () => {
		await deleteTaskTimesheet({ logIds: [timeLog.id] })
			.then(() => {
				sonnerToast.success(t('toasts.time.LOG_DELETED'));
			})
			.catch((error: unknown) => {
				// The failure toast comes from the global mutation fallback
				console.error('Failed to delete the time log', error);
			});
	};

	return (
		<>
			<AlertConfirmationModal
				description={t('common.IRREVERSIBLE_ACTION_WARNING')}
				close={closeAlertConfirmation}
				loading={loadingDeleteTimesheet}
				onAction={handleDeleteTimeLog}
				open={isOpenAlert}
				title={t('common.DELETE_CONFIRMATION')}
			/>
			<EditTaskModal closeModal={isCloseModalEditTask} isOpen={isEditTask} timeLogData={timeLog} />
			<RejectSelectedModal
				selectTimesheetId={timeLog.timesheetId ? [timeLog.timesheetId] : []}
				onReject={() => sonnerToast.success(t('toasts.time.LOG_REJECTED'))}
				maxReasonLength={120}
				minReasonLength={0}
				closeModal={closeRejectModal}
				isOpen={isRejectOpen}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
						<span className="sr-only">{t('common.MORE_OPTIONS')}</span>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{canEdit && (
						<>
							<DropdownMenuItem className="cursor-pointer" onClick={isOpenModalEditTask}>
								<Pencil />
								{t('common.EDIT')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}
					<StatusTask timeLog={timeLog} onReject={openRejectModal} />
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={openAlertConfirmation} className="cursor-pointer">
						<Trash />
						{t('common.DELETE')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};

export const StatusTask = ({ timeLog, onReject }: { timeLog: ITimeLog; onReject: () => void }) => {
	const t = useTranslations();

	const { mutateAsync: updateTimelog } = useUpdateTimeLogMutation();
	const updateTimelogBillableStatus = React.useCallback(
		async (isBillable: boolean) => {
			await updateTimelog({
				timeLogId: timeLog.id,
				startedAt: timeLog.startedAt,
				stoppedAt: timeLog.stoppedAt,
				employeeId: timeLog.employeeId,
				isBillable
			}).catch((error: unknown) => {
				// The failure toast comes from the global mutation fallback
				console.error('Failed to change the billable state', error);
			});
		},
		[updateTimelog, timeLog.id, timeLog.startedAt, timeLog.stoppedAt, timeLog.employeeId]
	);

	const { updateTimesheetStatus } = useUpdateTimesheet();
	const handleStatusChange = async (status: ETimesheetStatus, ids: string[]) => {
		await updateTimesheetStatus({
			status,
			ids
		})
			.then(() => {
				sonnerToast.success(t('toasts.time.STATUS_CHANGED'));
			})
			.catch((error: unknown) => {
				// The failure toast comes from the global mutation fallback
				console.error('Failed to change the timesheet status', error);
			});
	};

	// An approver may set any status, a manager of a team of the member only approved or denied
	const { getAllowedStatuses } = useTimesheetReview();
	const allowedStatuses = getAllowedStatuses([timeLog]);
	const statusChoices = statusTable.filter((status) => allowedStatuses.includes(status.label));
	const canUpdateTimeSheetStatus = statusChoices.length > 0;
	return (
		<>
			{canUpdateTimeSheetStatus ? (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<CheckCircle2 />
						<span>{t('common.CHANGE_STATUS')}</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							{statusChoices.map((status, index) => (
								<DropdownMenuItem
									onClick={() => {
										if (!timeLog.timesheetId) return;
										// A rejection carries a reason, and only the reject modal collects one.
										if (status.label === ETimesheetStatus.DENIED) return onReject();
										void handleStatusChange(status.label as ETimesheetStatus, [
											timeLog.timesheetId
										]);
									}}
									key={index}
									textValue={status.label}
									className="cursor-pointer"
								>
									<span className="flex size-4 shrink-0 items-center justify-center">
										<span
											className={clsxm(
												'size-1.5 rounded-full',
												timesheetStatusDotClass(status.label)
											)}
										/>
									</span>
									<span>{status.label}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
			) : null}
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<DollarCircle />
					<span>{t('pages.timesheet.BILLABLE.BILLABLE')}</span>
				</DropdownMenuSubTrigger>
				<DropdownMenuPortal>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							onClick={async () => {
								await updateTimelogBillableStatus(true);
							}}
							textValue={'Yes'}
							className="cursor-pointer"
						>
							<Check />
							<span>{t('pages.timesheet.BILLABLE.YES')}</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={async () => {
								await updateTimelogBillableStatus(false);
							}}
							textValue={'No'}
							className="cursor-pointer"
						>
							<X />
							<span>{t('pages.timesheet.BILLABLE.NO')}</span>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuPortal>
			</DropdownMenuSub>
		</>
	);
};

export const getBadgeColor = (timesheetStatus: ETimesheetStatus | null) => {
	const tone = timesheetStatusTone(timesheetStatus);
	return badgeVariants({ variant: tone });
};

type SortOrder = 'ASC' | 'DESC';

const HeaderColumn = ({
	label,
	onSort,
	currentSort
}: {
	label: string;
	onSort: () => void;
	currentSort: SortOrder | null;
}) => (
	<div className="flex items-center gap-x-1.5" role="columnheader">
		<span>{label}</span>
		<button
			onClick={onSort}
			aria-label={`Sort ${label} column ${currentSort ? `currently ${currentSort.toLowerCase()}` : ''}`}
			className="flex flex-col items-start gap-0 rounded-sm leading-none text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<CaretUpIcon className="h-2.5" />
			<CaretDownIcon className="h-2.5" />
		</button>
	</div>
);

const HeaderRow = ({
	status,
	onSort,
	data,
	handleSelectRowByStatusAndDate,
	date,
	selectedIds
}: {
	status: string;
	onSort: (key: string, order: SortOrder) => void;
	data: ITimeLog[];
	handleSelectRowByStatusAndDate: (status: string, date: string) => void;
	date?: string;
	selectedIds: ITimeLog[];
}) => {
	const [sortState, setSortState] = React.useState<{ [key: string]: SortOrder | null }>({
		Task: null,
		Project: null,
		Employee: null,
		Status: null
	});
	const isAllSelected = data.length > 0 && data.every((row) => selectedIds.includes(row));

	const handleSort = (key: string) => {
		const newOrder = sortState[key] === 'ASC' ? 'DESC' : 'ASC';
		setSortState({ ...sortState, [key]: newOrder });
		onSort(key, newOrder);
	};

	return (
		<div className="flex h-9 w-full items-center gap-4 hairline-t border-border bg-foreground/2.5 px-4 text-xs font-medium text-muted-foreground">
			<Checkbox
				checked={isAllSelected}
				onCheckedChange={() => date && handleSelectRowByStatusAndDate(status, date)}
				disabled={!date}
			/>
			<div className="min-w-0 flex-2">
				<HeaderColumn label="Task" onSort={() => handleSort('Task')} currentSort={sortState['Task']} />
			</div>
			<div className="flex-1">
				<HeaderColumn label="Project" onSort={() => handleSort('Project')} currentSort={sortState['Project']} />
			</div>
			<div className="flex-1">
				<HeaderColumn
					label="Employee"
					onSort={() => handleSort('Employee')}
					currentSort={sortState['Employee']}
				/>
			</div>
			<div className="flex-1">
				<HeaderColumn label="Status" onSort={() => handleSort('Status')} currentSort={sortState['Status']} />
			</div>
			<div className="w-24 shrink-0 text-right">
				<span>Time</span>
			</div>
			<div aria-hidden="true" className="size-8 shrink-0" />
		</div>
	);
};
