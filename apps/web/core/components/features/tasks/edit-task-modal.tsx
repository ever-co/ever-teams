import { Modal, modalFooterClass, modalPrimaryActionClass, modalSecondaryActionClass } from '@/core/components';
import { DatePickerFilter } from '../../pages/timesheet/timesheet-filter-date';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clsxm } from '@/core/lib/utils';
import { Item, ManageOrMemberComponent, getNestedValue } from '@/core/components/teams/manage-member-component';
import { statusTable } from '../../timesheet/timesheet-action';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { differenceBetweenHours, formatTimeFromDate, secondsToTime, toDate } from '@/core/lib/helpers/index';
import { addMinutes, format, parseISO } from 'date-fns';
import { Clock, Spinner } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { CustomSelect } from '../../common/multiple-select';
import { TimeLogTaskField } from '../timesheet/time-log-task-field';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useUpdateTimeLogMutation } from '@/core/hooks/timesheet';
import { useTimeLogTaskChoice } from '@/core/hooks/timesheet/use-time-log-task-choice';
import { ITimeLogUpdatePayload } from '@/core/types/interfaces/timesheet/time-log.interface';
import { useMyRolePermissionsQuery } from '@/core/hooks';

interface IEditTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	timeLogData: ITimeLog;
}

export function EditTaskModal({ isOpen, closeModal, timeLogData }: IEditTaskModalProps) {
	const { organizationProjects } = useOrganizationProjectsQuery();

	const activeTeam = useAtomValue(activeTeamState);
	const t = useTranslations();
	const { mutateAsync: updateTimeLog, isPending: isUpdateTimeLogLoading } = useUpdateTimeLogMutation();
	const initialTimeRange = {
		startTime: formatTimeFromDate(timeLogData.startedAt),
		endTime: formatTimeFromDate(timeLogData.stoppedAt)
	};

	const { myPermissions } = useMyRolePermissionsQuery();
	const canUpdateTimeSheetStatus = useMemo(
		() => (myPermissions ?? []).includes('CAN_APPROVE_TIMESHEET'),
		[myPermissions]
	);

	const initialDate = timeLogData.startedAt ?? timeLogData.timesheet?.startedAt;
	const [dateRange, setDateRange] = useState<{ date: Date | null }>({
		date: initialDate ? new Date(initialDate) : new Date()
	});
	const seconds =
		timeLogData.startedAt && timeLogData.stoppedAt
			? differenceBetweenHours(toDate(timeLogData.startedAt), toDate(timeLogData.stoppedAt))
			: 0;
	const { hours, minutes } = secondsToTime(seconds);
	// A log that runs past local midnight: its end time reads earlier than its start time
	const spansMidnight =
		!!timeLogData.startedAt &&
		!!timeLogData.stoppedAt &&
		toDate(timeLogData.startedAt).toDateString() !== toDate(timeLogData.stoppedAt).toDateString();

	const [timeRange, setTimeRange] = useState<{ startTime: string; endTime: string }>(initialTimeRange);

	/**
	 * Updates the start or end time in the state based on the provided key and value.
	 * @param {string} key - The key of the time range to update. This can be either 'startTime' or 'endTime'.
	 * @param {string} value - The new value for the selected time range.
	 */
	const updateTime = (key: 'startTime' | 'endTime', value: string) => {
		setTimeRange((prevState) => ({
			...prevState,
			[key]: value
		}));
	};
	const [timesheetData, setTimesheetData] = useState({
		isBillable: timeLogData.isBillable ?? true,
		projectId: timeLogData.project?.id || '',
		notes: timeLogData.description || '',
		employeeId: timeLogData.employeeId || ''
	});
	const taskChoice = useTimeLogTaskChoice({
		log: timeLogData,
		projects: organizationProjects,
		pickedProjectId: timesheetData.projectId
	});
	const memberItemsLists = useMemo(
		() => ({
			Project: taskChoice.projectChoices
		}),
		[taskChoice.projectChoices]
	);
	/**
	 * Updates the project id in the form state when a project is selected or deselected in the dropdown.
	 * @param {Object} values - An object with the selected values from the dropdown.
	 * @param {Item | null} values['Project'] - The selected project.
	 */
	const handleSelectedValuesChange = useCallback((values: { [key: string]: Item | null }) => {
		if (!values['Project']) return;
		setTimesheetData((prev) => ({
			...prev,
			projectId: values['Project']?.id || ''
		}));
	}, []);
	const selectedValues = useMemo(
		() => ({
			Project: taskChoice.shownProject
		}),
		[taskChoice.shownProject]
	);
	const handleChange = useCallback((field: string, selectedItem: Item | null) => {
		if (!selectedItem) return;
		setTimesheetData((prev) => ({
			...prev,
			[field]: selectedItem.id
		}));
	}, []);

	const handleUpdateSubmit = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!timeRange.startTime || !timeRange.endTime) {
				alert('Please enter valid start and end times.');
				return;
			}
			if (!/^\d{2}:\d{2}$/.test(timeRange.startTime) || !/^\d{2}:\d{2}$/.test(timeRange.endTime)) {
				alert('Time format should be HH:MM.');
				return;
			}

			const baseDate = dateRange.date ?? new Date();
			// The inputs show local times, so they are read back in local time, not as UTC.
			const startedAt = new Date(
				baseDate.getFullYear(),
				baseDate.getMonth(),
				baseDate.getDate(),
				...timeRange.startTime.split(':').map(Number)
			);
			// An end at or before the start is on the next day (a log across local midnight), never before its start.
			// Chosen from the HH:MM values and built on that day directly: building it on the start day first and then
			// moving it would carry a daylight-saving shift of the start day into the end time.
			const endDayOffset = timeRange.endTime <= timeRange.startTime ? 1 : 0;
			const stoppedAt = new Date(
				baseDate.getFullYear(),
				baseDate.getMonth(),
				baseDate.getDate() + endDayOffset,
				...timeRange.endTime.split(':').map(Number)
			);
			// A time inside a daylight-saving gap (e.g. 02:30 on the spring-forward day) is moved an hour by Date,
			// which can still put the end at or before the start: refuse it rather than save a reversed log
			if (stoppedAt.getTime() <= startedAt.getTime()) {
				alert(t('pages.timeLog.END_AFTER_START'));
				return;
			}
			const updatePayload: ITimeLogUpdatePayload = {
				timeLogId: timeLogData.id,
				isBillable: timesheetData.isBillable,
				employeeId: timesheetData.employeeId,
				description: timesheetData.notes,
				projectId: timesheetData.projectId,
				startedAt,
				stoppedAt,
				...taskChoice.changedFields
			};
			updateTimeLog(updatePayload)
				.then(() => {
					toast.success(t('toasts.time.LOG_UPDATED'));
					closeModal();
				})
				.catch((error) => {
					// The failure toast comes from the global mutation fallback
					if (!error) {
						closeModal();
					}
				});
		},
		[
			timeRange.startTime,
			timeRange.endTime,
			dateRange.date,
			timeLogData.id,
			timeLogData.logType,
			timeLogData.source,
			timeLogData.tenantId,
			timesheetData.isBillable,
			timesheetData.employeeId,
			timesheetData.notes,
			timesheetData.projectId,
			taskChoice.changedFields,
			closeModal,
			updateTimeLog,
			t
		]
	);

	const itemToValue = useCallback((item: Item | null, valueKey: string) => getNestedValue(item, valueKey) || '', []);

	const itemToString = useCallback(
		(item: Item | null, displayKey: string) => getNestedValue(item, displayKey) || '',
		[]
	);

	const classNameTitle = 'text-xs font-medium text-muted-foreground';

	const fields = useMemo(
		() => [
			{
				label: t('sidebar.PROJECTS'),
				placeholder: 'Select a project',
				isRequired: true,
				valueKey: 'id',
				displayKey: 'name',
				element: 'Project',
				defaultValue: 'name'
			}
		],
		[t]
	);

	const handleFromChange = (fromDate: Date | null) => {
		setDateRange((prev) => ({ ...prev, date: fromDate }));
	};
	const getMinEndTime = (): string => {
		if (!timeRange.startTime) return '00:00';
		const startDate = parseISO(`2000-01-01T${timeRange.startTime}`);
		return format(addMinutes(startDate, 5), 'HH:mm');
	};

	const taskNumber = timeLogData.task?.taskNumber;
	let timeLogBreadcrumb: string | undefined;
	if (taskNumber) {
		timeLogBreadcrumb = `#${taskNumber}`;
	}

	let submitLabel = t('common.SAVE');
	if (isUpdateTimeLogLoading) {
		submitLabel = t('common.PROCESSING');
	}

	return (
		<Modal
			closeModal={closeModal}
			isOpen={isOpen}
			showCloseIcon
			title={t('common.TIME_LOG')}
			breadcrumb={timeLogBreadcrumb}
			className="w-full md:w-40 md:min-w-[32rem] justify-start h-[auto]"
		>
			<form onSubmit={handleUpdateSubmit} className="flex flex-col w-full">
				<div className="flex flex-col gap-1 pb-3 mb-4 hairline-b border-border">
					<TimeLogTaskField choice={taskChoice} entryTask={timeLogData.task} />
					<div className="flex gap-x-1 items-center">
						<span className="text-[13px] text-muted-foreground">{t('modals.timeLog.forMember')}</span>
						<CustomSelect
							defaultValue={timeLogData.employee?.fullName}
							placeholder={timeLogData.employee?.fullName}
							valueKey="employeeId"
							className="hairline-border border-transparent hover:border-transparent dark:hover:border-transparent"
							options={activeTeam?.members || []}
							value={timesheetData.employeeId}
							onChange={(value) => {
								setTimesheetData({ ...timesheetData, employeeId: value });
							}}
							renderOption={(option) => option.employee.fullName}
						/>
					</div>
				</div>
				<div className="flex flex-col gap-4 justify-center items-start">
					<div>
						<span className="text-xs font-medium capitalize text-muted-foreground">
							{t('dailyPlan.TASK_TIME')}
						</span>
						<div className="flex gap-x-2 items-center">
							<Clock className="size-4 text-success-foreground" />
							<span className="tabular-nums">
								{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')} h
							</span>
						</div>
					</div>
					<div className="grid w-full grid-cols-2 gap-4">
						<div>
							<label className="mb-1 block text-xs font-medium text-muted-foreground">
								{t('manualTime.START_TIME')}
								<span className="ml-1 text-destructive-ink">*</span>
							</label>
							<input
								defaultValue={timeRange.startTime || '09:00'}
								aria-label={t('manualTime.START_TIME')}
								aria-describedby="start-time-error"
								type="time"
								min="00:00"
								max="23:59"
								pattern="[0-9]{2}:[0-9]{2}"
								onChange={(e) => updateTime('startTime', e.target.value)}
								className={clsxm(controlRecipe, 'h-9 px-2.5 font-normal tabular-nums')}
								required
							/>
						</div>

						<div>
							<label className="mb-1 block text-xs font-medium text-muted-foreground">
								{t('manualTime.END_TIME')}
								<span className="ml-1 text-destructive-ink">*</span>
							</label>
							<input
								defaultValue={timeRange.endTime || '10:00'}
								aria-label={t('manualTime.END_TIME')}
								aria-describedby="end-time-error"
								type="time"
								min={spansMidnight ? undefined : getMinEndTime()}
								onChange={(e) => updateTime('endTime', e.target.value)}
								className={clsxm(controlRecipe, 'h-9 px-2.5 font-normal tabular-nums')}
								required
							/>
						</div>
					</div>
					<div>
						<span className="mr-2 mb-1 block text-xs font-medium text-muted-foreground">
							{t('manualTime.DATE')}
						</span>
						<DatePickerFilter date={dateRange.date} setDate={handleFromChange} label="Oct 01 2024" />
					</div>
					<div className="flex flex-col w-full">
						<ManageOrMemberComponent
							classNameTitle={classNameTitle}
							fields={fields}
							itemsLists={memberItemsLists}
							selectedValues={selectedValues}
							onSelectedValuesChange={handleSelectedValuesChange}
							handleChange={handleChange}
							itemToString={itemToString}
							itemToValue={itemToValue}
						/>
					</div>
					<div className="flex flex-col items-start gap-1">
						<label className="text-xs font-medium capitalize text-muted-foreground">
							{t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()}
						</label>
						<div className="flex gap-3 items-center">
							<ToggleButton
								isActive={timesheetData.isBillable}
								onClick={() =>
									setTimesheetData((prev) => ({
										...prev,
										isBillable: true
									}))
								}
								label={t('pages.timesheet.BILLABLE.YES')}
							/>
							<ToggleButton
								isActive={!timesheetData.isBillable}
								onClick={() =>
									setTimesheetData((prev) => ({
										...prev,
										isBillable: false
									}))
								}
								label={t('pages.timesheet.BILLABLE.NO')}
							/>
						</div>
					</div>
					<div className="flex flex-col w-full">
						<span className="mb-1 text-xs font-medium text-muted-foreground">{t('common.NOTES')}</span>
						<textarea
							value={timesheetData.notes}
							onChange={(e) =>
								setTimesheetData((prev) => ({
									...prev,
									notes: e.target.value
								}))
							}
							placeholder={t('modals.timeLog.notesPlaceholder')}
							className={clsxm(
								controlRecipe,
								'placeholder:font-normal resize-none p-3 grow w-full h-40',
								timesheetData.notes.trim().length === 0 && 'border-destructive'
							)}
							maxLength={120}
							minLength={0}
							aria-label={t('modals.timeLog.notesPlaceholder')}
							required
						/>
						<div className="text-xs tabular-nums text-right text-muted-foreground">
							{timesheetData.notes.length}/{120}
						</div>
					</div>
					<div className="w-full hairline-t border-border"></div>
					<div className="flex w-full items-center justify-between gap-2">
						<div className="flex flex-col justify-center items-start">
							{canUpdateTimeSheetStatus ? (
								<CustomSelect
									defaultValue={timeLogData.timesheet?.status ?? ''}
									ariaLabel={timeLogData.timesheet?.status ?? ''}
									className="ring-offset-sidebar-primary-foreground w-[150px]"
									options={statusTable?.flatMap((status) => status.label)}
								/>
							) : null}
						</div>
						<div className={modalFooterClass}>
							<Button
								onClick={closeModal}
								type="button"
								variant="ghost"
								size="default"
								className={modalSecondaryActionClass}
							>
								{t('common.CANCEL')}
							</Button>
							<Button
								disabled={isUpdateTimeLogLoading}
								type="submit"
								size="default"
								className={modalPrimaryActionClass}
							>
								{isUpdateTimeLogLoading && <Spinner className="size-4 animate-spin" />}
								{submitLabel}
							</Button>
						</div>
					</div>
				</div>
			</form>
		</Modal>
	);
}

interface ToggleButtonProps {
	isActive: boolean;
	onClick: () => void;
	label: string;
}

export const ToggleButton = ({ isActive, onClick, label }: ToggleButtonProps) => (
	<button
		type="button"
		onClick={onClick}
		aria-pressed={isActive}
		className={clsxm(
			'flex gap-x-2 items-center p-2 text-sm rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
			'transition-colors duration-200 ease-in-out hover:bg-foreground/5'
		)}
	>
		<div
			className={clsxm(
				'size-4 rounded-full transition-colors duration-200 ease-in-out',
				isActive && 'bg-primary ring-4 ring-primary/15',
				!isActive && 'bg-foreground/10'
			)}
		/>
		<span className={clsxm('text-foreground', isActive && 'font-medium text-primary-ink')}>{label}</span>
	</button>
);
