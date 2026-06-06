import { Modal } from '@/core/components';
import { DatePickerFilter } from '../../pages/timesheet/timesheet-filter-date';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { clsxm } from '@/core/lib/utils';
import { Item, ManageOrMemberComponent, getNestedValue } from '@/core/components/teams/manage-member-component';
import { statusTable } from '../../timesheet/timesheet-action';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { differenceBetweenHours, formatTimeFromDate, secondsToTime, toDate } from '@/core/lib/helpers/index';
import { ReloadIcon } from '@radix-ui/react-icons';
import { addMinutes, format, parseISO } from 'date-fns';
import { Clock7 } from 'lucide-react';
import { CustomSelect } from '../../common/multiple-select';
import { TaskNameInfoDisplay } from '../../tasks/task-displays';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useUpdateTimeLogMutation } from '@/core/hooks/timesheet';
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

	const [dateRange, setDateRange] = useState<{ date: Date | null }>({
		date: timeLogData.timesheet?.startedAt ? new Date(timeLogData.timesheet.startedAt) : new Date()
	});
	const seconds =
		timeLogData.startedAt && timeLogData.stoppedAt
			? differenceBetweenHours(toDate(timeLogData.startedAt), toDate(timeLogData.stoppedAt))
			: 0;
	const { hours, minutes } = secondsToTime(seconds);

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
	const memberItemsLists = useMemo(
		() => ({
			Project: organizationProjects
		}),
		[organizationProjects]
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
			Project: timeLogData.project || null
		}),
		[timeLogData.project]
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
			const startedAt = new Date(
				Date.UTC(
					baseDate.getFullYear(),
					baseDate.getMonth(),
					baseDate.getDate(),
					...timeRange.startTime.split(':').map(Number)
				)
			);
			const stoppedAt = new Date(
				Date.UTC(
					baseDate.getFullYear(),
					baseDate.getMonth(),
					baseDate.getDate(),
					...timeRange.endTime.split(':').map(Number)
				)
			);
			const updatePayload: ITimeLogUpdatePayload = {
				timeLogId: timeLogData.id,
				isBillable: timesheetData.isBillable,
				employeeId: timesheetData.employeeId,
				description: timesheetData.notes,
				projectId: timesheetData.projectId,
				startedAt,
				stoppedAt
			};
			updateTimeLog(updatePayload)
				.then(() => {
					toast.success(t('pages.timeLog.MODIFICATION_CONFIRMED'), {
						description: t('pages.timeLog.MODIFY_SUCCESS')
					});
					closeModal();
				})
				.catch((error) => {
					toast.error(t('pages.timeLog.MODIFICATION_ERROR_TITLE'), {
						description: t('pages.timeLog.MODIFY_ERROR')
					});
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

	const classNameTitle = 'text-[#282048] dark:text-gray-500';

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

	return (
		<Modal
			closeModal={closeModal}
			isOpen={isOpen}
			showCloseIcon
			title={t('common.TIME_LOG')}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start h-[auto]"
			titleClass="font-bold flex justify-start w-full"
		>
			<form onSubmit={handleUpdateSubmit} className="flex flex-col w-full">
				<div className="flex flex-col border-b border-b-slate-100 dark:border-b-gray-700">
					<TaskNameInfoDisplay
						task={timeLogData.task}
						className={clsxm(
							'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
						)}
						taskTitleClassName={clsxm('text-sm text-ellipsis overflow-hidden')}
						showSize={true}
						dash
						taskNumberClassName="text-sm"
					/>
					<div className="flex gap-x-1 items-center">
						<span className="text-gray-400">for</span>
						<CustomSelect
							defaultValue={timeLogData.employee?.fullName}
							placeholder={timeLogData.employee?.fullName}
							valueKey="employeeId"
							className="border border-transparent hover:border-transparent dark:hover:border-transparent"
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
						<span className="text-[#282048] dark:text-gray-500 capitalize ">
							{t('dailyPlan.TASK_TIME')}
						</span>
						<div className="flex gap-x-2 items-center">
							<Clock7 className="text-[#30B366]" />
							<span>
								{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')} h
							</span>
						</div>
					</div>
					<div className="flex items-center w-full">
						<div className=" w-[48%] mr-[4%]">
							<label className="block text-[#282048] dark:text-gray-500   mb-1">
								{t('manualTime.START_TIME')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>
							<input
								defaultValue={timeRange.startTime || '09:00'}
								aria-label="Start time"
								aria-describedby="start-time-error"
								type="time"
								min="00:00"
								max="23:59"
								pattern="[0-9]{2}:[0-9]{2}"
								onChange={(e) => updateTime('startTime', e.target.value)}
								className="p-1 w-full font-normal rounded-md border border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
								required
							/>
						</div>

						<div className=" w-[48%]">
							<label className="block text-[#282048] dark:text-gray-500   mb-1">
								{t('manualTime.END_TIME')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>
							<input
								defaultValue={timeRange.endTime || '10:00'}
								aria-label="End time"
								aria-describedby="end-time-error"
								type="time"
								min={getMinEndTime()}
								onChange={(e) => updateTime('endTime', e.target.value)}
								className="p-1 w-full font-normal rounded-md border border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
								required
							/>
						</div>
					</div>
					<div>
						<span className="block text-[#282048] dark:text-gray-500   mr-2">{t('manualTime.DATE')}</span>
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
					<div className="flex flex-col items-center">
						<label className="text-[#282048] dark:text-gray-500   mr-12 capitalize">
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
						<span className="text-[#282048] dark:text-gray-400">{t('common.NOTES')}</span>
						<textarea
							value={timesheetData.notes}
							onChange={(e) =>
								setTimesheetData((prev) => ({
									...prev,
									notes: e.target.value
								}))
							}
							placeholder="Insert notes here..."
							className={clsxm(
								'bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent',
								'placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full',
								'border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40 bg-[#FBB6500D]',
								timesheetData.notes.trim().length === 0 && 'border-red-500'
							)}
							maxLength={120}
							minLength={0}
							aria-label="Insert notes here"
							required
						/>
						<div className="text-sm text-[#282048] dark:text-gray-500   text-right">
							{timesheetData.notes.length}/{120}
						</div>
					</div>
					<div className="w-full border-t border-t-gray-200 dark:border-t-gray-700"></div>
					<div className="!flex items-center justify-between gap-2 w-full">
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
						<div className="flex gap-x-2 justify-end items-center w-full">
							<button
								onClick={closeModal}
								type="button"
								className={clsxm(
									'dark:text-primary-light h-[2.3rem] w-[5.5rem] border px-2 rounded-lg border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light'
								)}
							>
								{t('common.CANCEL')}
							</button>
							<button
								disabled={isUpdateTimeLogLoading}
								type="submit"
								className={clsxm(
									'bg-primary dark:bg-primary-light h-[2.3rem] w-[5.5rem] justify-center font-normal flex items-center text-white px-2 rounded-lg'
								)}
							>
								{isUpdateTimeLogLoading && <ReloadIcon className="mr-2 w-4 h-4 animate-spin" />}
								{isUpdateTimeLogLoading ? 'Processing...' : t('common.SAVE')}
							</button>
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
			'flex gap-x-2 items-center p-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary-light/50',
			'transition-colors duration-200 ease-in-out'
		)}
	>
		<div
			className={clsxm(
				'w-4 h-4 rounded-full transition-colors duration-200 ease-in-out',
				isActive ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200'
			)}
		/>
		<span className={clsxm('', isActive && 'text-primary dark:text-primary-light')}>{label}</span>
	</button>
);
