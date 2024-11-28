import { Modal, statusColor } from "@/lib/components";
import { IoMdArrowDropdown } from "react-icons/io";
import { FaRegClock } from "react-icons/fa";
import { DatePickerFilter } from "./TimesheetFilterDate";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { clsxm } from "@/app/utils";
import { Item, ManageOrMemberComponent, getNestedValue } from "@/lib/features/manual-time/manage-member-component";
import { useTeamTasks } from "@/app/hooks";
import { CustomSelect, TaskNameInfoDisplay } from "@/lib/features";
import { statusTable } from "./TimesheetAction";
import { TimesheetLog } from "@/app/interfaces";

export interface IEditTaskModalProps {
	isOpen: boolean;
	closeModal: () => void;
	dataTimesheet: TimesheetLog
}
export function EditTaskModal({ isOpen, closeModal, dataTimesheet }: IEditTaskModalProps) {
	const { activeTeam } = useTeamTasks();
	const t = useTranslations();
	// const [dateRange, setDateRange] = useState<{ from: Date | null }>({
	// 	from: new Date(),
	// });
	// const [endTime, setEndTime] = useState<string>('');
	// const [startTime, setStartTime] = useState<string>('');
	// const [isBillable, setIsBillable] = useState<boolean>(dataTimesheet.isBillable);
	// const [notes, setNotes] = useState('');

	const [dateRange, setDateRange] = useState<{ from: Date | null }>({
		from: dataTimesheet.timesheet?.startedAt ? new Date(dataTimesheet.timesheet.startedAt) : new Date(),
	});
	const [endTime, setEndTime] = useState<string>(
		dataTimesheet.timesheet?.stoppedAt
			? new Date(dataTimesheet.timesheet.stoppedAt).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
			: ''
	);
	const [startTime, setStartTime] = useState<string>(
		dataTimesheet.timesheet?.startedAt
			? new Date(dataTimesheet.timesheet.startedAt).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
			: ''
	);
	const [isBillable, setIsBillable] = useState<boolean>(dataTimesheet.isBillable);
	const [notes, setNotes] = useState<string>('');
	const memberItemsLists = {
		Project: activeTeam?.projects as [],
	};
	const handleSelectedValuesChange = (values: { [key: string]: Item | null }) => {
		// Handle value changes
	};
	const selectedValues = {
		Teams: null,
	};
	const handleChange = (field: string, selectedItem: Item | null) => {
		// Handle field changes
	};

	const fields = [
		{
			label: t('sidebar.PROJECTS'),
			placeholder: 'Select a project',
			isRequired: true,
			valueKey: 'id',
			displayKey: 'name',
			element: 'Project'
		},
	];

	const handleFromChange = (fromDate: Date | null) => {
		setDateRange((prev) => ({ ...prev, from: fromDate }));
	};
	return (
		<Modal
			closeModal={closeModal}
			isOpen={isOpen}
			showCloseIcon
			title={'Edit Task'}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[30rem] justify-start h-[auto]"
			titleClass="font-bold flex justify-start w-full">
			<div className="flex flex-col w-full">
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
						<span className="text-[#282048] dark:text-gray-500 ">Task Time</span>
						<div className="flex items-center gap-x-2 ">
							<FaRegClock className="text-[#30B366]" />
							<span>08:10h</span>
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
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
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
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
								required
							/>
						</div>

					</div>
					<div>
						<span className="block text-[#282048] dark:text-gray-500   mr-2">{t("manualTime.DATE")}</span>
						<DatePickerFilter
							date={dateRange.from}
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
								isActive={isBillable}
								onClick={() => setIsBillable(true)}
								label={t('pages.timesheet.BILLABLE.YES')}
							/>
							<ToggleButton
								isActive={!isBillable}
								onClick={() => setIsBillable(false)}
								label={t('pages.timesheet.BILLABLE.NO')}
							/>
						</div>
					</div>
					<div className="w-full flex flex-col">
						<span className="text-[#282048] dark:text-gray-400">Notes</span>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Insert notes here..."
							className={clsxm(
								"bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent",
								"placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full",
								"border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40 bg-[#FBB6500D]",
								notes.trim().length === 0 && "border-red-500"
							)}
							maxLength={120}
							minLength={0}
							aria-label="Insert notes here"
							required
						/>
						<div className="text-sm text-[#282048] dark:text-gray-500   text-right">
							{notes.length}/{120}
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
			</div>

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
