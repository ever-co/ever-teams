import { Modal, statusColor } from "@/lib/components";
import { IoMdArrowDropdown } from "react-icons/io";
import { FaRegClock } from "react-icons/fa";
import { DatePickerFilter } from "./TimesheetFilterDate";
import { FormEvent, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { clsxm } from "@/app/utils";
import { Item, ManageOrMemberComponent, getNestedValue } from "@/lib/features/manual-time/manage-member-component";
import { useTeamTasks } from "@/app/hooks";
import { CustomSelect, TaskNameInfoDisplay } from "@/lib/features";
import { statusTable } from "./TimesheetAction";
import { TimesheetLog } from "@/app/interfaces";
import { secondsToTime } from "@/app/helpers";
import { useTimesheet } from "@/app/hooks/features/useTimesheet";

export interface IEditTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	dataTimesheet: TimesheetLog
}
export function EditTaskModal({ isOpen, closeModal, dataTimesheet }: IEditTaskModalProps) {
	const { activeTeam } = useTeamTasks();
	const t = useTranslations();
	const { updateTimesheet } = useTimesheet({})

	const [dateRange, setDateRange] = useState<{ date: Date | null }>({
		date: dataTimesheet.timesheet?.startedAt ? new Date(dataTimesheet.timesheet.startedAt) : new Date(),
	});

	const { h: hours, m: minutes } = secondsToTime(dataTimesheet.timesheet.duration);

	const [timeRange, setTimeRange] = useState<{ startTime: string; endTime: string }>({
		startTime: dataTimesheet.timesheet?.startedAt
			? dataTimesheet.timesheet.startedAt.toString().slice(0, 5)
			: '',
		endTime: dataTimesheet.timesheet?.stoppedAt
			? dataTimesheet.timesheet.stoppedAt.toString().slice(0, 5)
			: '',
	});

	const updateTime = (key: 'startTime' | 'endTime', value: string) => {
		setTimeRange(prevState => ({
			...prevState,
			[key]: value,
		}));
	};
	const [timesheetData, setTimesheetData] = useState({
		isBillable: dataTimesheet.isBillable,
		projectId: dataTimesheet.project?.id || '',
		notes: dataTimesheet.description || '',
	});

	const memberItemsLists = {
		Project: activeTeam?.projects as [],
	};
	const handleSelectedValuesChange = (values: { [key: string]: Item | null }) => {
		setTimesheetData((prev) => ({
			...prev,
			projectId: values['Project']?.id,
		}));
	};
	const selectedValues = {
		Teams: null,
	};
	const handleChange = (field: string, selectedItem: Item | null) => {
		// Handle field changes
	};

	const handleUpdateSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
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
		await updateTimesheet({
			id: dataTimesheet.timesheetId,
			isBillable: timesheetData.isBillable,
			employeeId: dataTimesheet.employeeId,
			logType: dataTimesheet.logType,
			source: dataTimesheet.source,
			startedAt: startedAt,
			stoppedAt: stoppedAt,
			tenantId: dataTimesheet.tenantId,
			organizationId: dataTimesheet.organizationId,
			description: timesheetData.notes,
			projectId: timesheetData.projectId,
		});
	}, [dateRange, timeRange, timesheetData, dataTimesheet, updateTimesheet]);

	const fields = [
		{
			label: t('sidebar.PROJECTS'),
			placeholder: 'Select a project',
			isRequired: true,
			valueKey: 'id',
			displayKey: 'name',
			element: 'Project',
			defaultValue: 'name'

		},
	];

	const handleFromChange = (fromDate: Date | null) => {
		setDateRange((prev) => ({ ...prev, date: fromDate }));
	};
	return (
		<Modal
			closeModal={closeModal}
			isOpen={isOpen}
			showCloseIcon
			title={'Edit Task'}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start h-[auto]"
			titleClass="font-bold flex justify-start w-full">
			<form onSubmit={handleUpdateSubmit} className="flex flex-col w-full">
				<div className="flex flex-col border-b border-b-slate-100 dark:border-b-gray-700">
					<TaskNameInfoDisplay
						task={dataTimesheet.task}
						className={clsxm('shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent')}
						taskTitleClassName={clsxm('text-sm text-ellipsis overflow-hidden ')}
						showSize={true}
						dash
						taskNumberClassName="text-sm"
					/>
					<div className="flex items-center gap-x-1 ">
						<span className="text-gray-400">for</span>
						<span className="text-primary dark:text-primary-light">{dataTimesheet.employee?.fullName ?? ""}</span>
						<IoMdArrowDropdown className="cursor-pointer" />
					</div>
				</div>
				<div className="flex items-start flex-col justify-center gap-4">
					<div>
						<span className="text-[#282048] dark:text-gray-500 ">{t('dailyPlan.TASK_TIME')}</span>
						<div className="flex items-center gap-x-2 ">
							<FaRegClock className="text-[#30B366]" />
							<span>{hours}:{minutes} h</span>
						</div>
					</div>
					<div className="flex items-center w-full">
						<div className=" w-[48%] mr-[4%]">
							<label className="block text-[#282048] dark:text-gray-500   mb-1">
								{t('manualTime.START_TIME')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>
							<input
								aria-label="Start time"
								aria-describedby="start-time-error"
								type="time"
								min="00:00"
								max="23:59"
								pattern="[0-9]{2}:[0-9]{2}"
								value={timeRange.startTime}
								onChange={(e) => updateTime("startTime", e.target.value)}
								className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
								required
							/>
						</div>

						<div className=" w-[48%]">
							<label className="block text-[#282048] dark:text-gray-500   mb-1">
								{t('manualTime.END_TIME')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>

							<input
								aria-label="End time"
								aria-describedby="end-time-error"
								type="time"
								value={timeRange.endTime}
								onChange={(e) => updateTime('endTime', e.target.value)}
								className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
								required
							/>
						</div>

					</div>
					<div>
						<span className="block text-[#282048] dark:text-gray-500   mr-2">{t("manualTime.DATE")}</span>
						<DatePickerFilter
							date={dateRange.date}
							setDate={handleFromChange}
							label="Oct 01 2024"
						/>
					</div>
					<div className="w-full flex flex-col">
						<ManageOrMemberComponent
							classNameTitle={'text-[#282048] dark:text-gray-500  '}
							fields={fields}
							itemsLists={memberItemsLists}
							selectedValues={selectedValues}
							onSelectedValuesChange={handleSelectedValuesChange}
							handleChange={handleChange}
							itemToString={(item, displayKey) => getNestedValue(item, displayKey) || ''}
							itemToValue={(item, valueKey) => getNestedValue(item, valueKey) || ''}
						/>
					</div>
					<div className=" flex flex-col items-center">
						<label className="text-[#282048] dark:text-gray-500   mr-12 capitalize">{t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()}</label>
						<div className="flex items-center gap-3">
							<ToggleButton
								isActive={timesheetData.isBillable}
								onClick={() => setTimesheetData((prev) => ({
									...prev,
									isBillable: true,
								}))}
								label={t('pages.timesheet.BILLABLE.YES')}
							/>
							<ToggleButton
								isActive={!timesheetData.isBillable}
								onClick={() => setTimesheetData((prev) => ({
									...prev,
									isBillable: false,
								}))}
								label={t('pages.timesheet.BILLABLE.NO')}
							/>
						</div>
					</div>
					<div className="w-full flex flex-col">
						<span className="text-[#282048] dark:text-gray-400">{t('common.NOTES')}</span>
						<textarea
							value={timesheetData.notes}
							onChange={(e) => setTimesheetData((prev) => ({
								...prev,
								notes: e.target.value,
							}))}
							placeholder="Insert notes here..."
							className={clsxm(
								"bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent",
								"placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full",
								"border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40 bg-[#FBB6500D]",
								timesheetData.notes.trim().length === 0 && "border-red-500"
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
					<div className="border-t border-t-gray-200 dark:border-t-gray-700 w-full"></div>
					<div className="!flex items-center justify-between gap-2 w-full">
						<div className="flex flex-col items-start justify-center ">
							<CustomSelect
								defaultValue={dataTimesheet.timesheet?.status ?? ""}
								ariaLabel={dataTimesheet.timesheet?.status ?? ""}
								className="ring-offset-sidebar-primary-foreground w-[150px]"
								options={statusTable?.flatMap((status) => status.label)}
								renderOption={(option) => (
									<div className="flex items-center gap-x-2 cursor-pointer">
										<div className={clsxm("p-2 rounded-full", statusColor(option).bg)}></div>
										<span className={clsxm("ml-1", statusColor(option).text,)}>{option}</span>
									</div>
								)}
							/>
						</div>
						<div className="flex items-center gap-x-2 justify-end w-full">
							<button
								type="button"
								className={clsxm("dark:text-primary-light h-[2.3rem] w-[5.5rem] border px-2 rounded-lg border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light")}>
								{t('common.CANCEL')}
							</button>
							<button
								type="submit"
								className={clsxm(
									'bg-primary dark:bg-primary-light h-[2.3rem] w-[5.5rem] justify-center font-normal flex items-center text-white px-2 rounded-lg',
								)}>
								{t('common.SAVE')}
							</button>
						</div>
					</div>
				</div>
			</form>

		</Modal>
	)
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
			'flex items-center gap-x-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary-light/50',
			'transition-colors duration-200 ease-in-out'
		)}
	>
		<div
			className={clsxm(
				'w-4 h-4 rounded-full transition-colors duration-200 ease-in-out',
				isActive ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200'
			)}
		/>
		<span className={clsxm('', isActive && 'text-primary dark:text-primary-light')}>
			{label}
		</span>
	</button>
)
