/* eslint-disable @typescript-eslint/no-unused-vars */
import '../../../styles/style.css';

import { format } from 'date-fns';
import { Button, Modal } from 'lib/components';
import { cn } from 'lib/utils';
import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { IoTime } from 'react-icons/io5';

import { manualTimeReasons } from '@app/constants';
import { useOrganizationTeams, useTeamTasks } from '@app/hooks';
import { useManualTime } from '@app/hooks/features/useManualTime';
import { IOrganizationTeamList } from '@app/interfaces';
import { IAddManualTimeRequest } from '@app/interfaces/timer/ITimerLogs';
import { clsxm } from '@app/utils';
import { DatePicker } from '@components/ui/DatePicker';

import { getNestedValue, Item, ManageOrMemberComponent } from './manage-member-component';
import { CustomSelect } from '../multiple-select';

/**
 * Interface for the properties of the `AddManualTimeModal` component.
 *
 * This interface defines the properties expected by the `AddManualTimeModal` component.
 *
 * @interface IAddManualTimeModalProps
 *
 * @property {boolean} isOpen - Indicates whether the modal is open or closed.
 * @property {"AddManuelTime" | "AddTime"} params - Determines the context in which the modal is used, either "AddManuelTime" for the Add Manuel Time view or "AddTime" for the   Add time.
 * @property {() => void} closeModal - Callback function to be called to close the modal.
 */
interface IAddManualTimeModalProps {
	isOpen: boolean;
	params: 'AddManuelTime' | 'AddTime';
	timeSheetStatus?: 'ManagerTimesheet' | 'TeamMemberTimesheet';
	closeModal: () => void;
}

export function AddManualTimeModal(props: Readonly<IAddManualTimeModalProps>) {
	const { closeModal, isOpen, params, timeSheetStatus } = props;
	const t = useTranslations();
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [errorMsg, setErrorMsg] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [date, setDate] = useState<Date>(new Date());
	const [startTime, setStartTime] = useState<string>('');
	const [team, setTeam] = useState<IOrganizationTeamList>();
	const [taskId, setTaskId] = useState<string>('');
	const [timeDifference, setTimeDifference] = useState<string>('');
	const { activeTeamTask, tasks, activeTeam } = useTeamTasks();
	const { teams } = useOrganizationTeams();

	const { addManualTime, addManualTimeLoading, timeLog } = useManualTime();

	useEffect(() => {
		const now = new Date();
		const currentTime = now.toTimeString().slice(0, 5);

		setDate(now);
		setStartTime(currentTime);
		setEndTime(currentTime);
	}, []);

	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const startedAt = new Date(date);
			const stoppedAt = new Date(date);

			// Set time for the started date
			startedAt.setHours(parseInt(startTime.split(':')[0]));
			startedAt.setMinutes(parseInt(startTime.split(':')[1]));

			// Set time for the stopped date
			stoppedAt.setHours(parseInt(endTime.split(':')[0]));
			stoppedAt.setMinutes(parseInt(endTime.split(':')[1]));

			const requestData: Omit<IAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'> = {
				startedAt,
				stoppedAt,
				taskId,
				description,
				reason,
				isBillable,
				organizationId: team?.organizationId
			};

			if (date && startTime && endTime && team && taskId) {
				if (endTime > startTime) {
					addManualTime(requestData); // [TODO : api] Allow team member to add manual time as well
				} else {
					setErrorMsg('End time should be after than start time');
				}
			} else {
				setErrorMsg("Please complete all required fields with a '*'");
			}
		},
		[addManualTime, date, description, endTime, isBillable, reason, startTime, taskId, team]
	);

	const calculateTimeDifference = useCallback(() => {
		const [startHours, startMinutes] = startTime.split(':').map(Number);
		const [endHours, endMinutes] = endTime.split(':').map(Number);

		const startTotalMinutes = startHours * 60 + startMinutes;
		const endTotalMinutes = endHours * 60 + endMinutes;

		const diffMinutes = endTotalMinutes - startTotalMinutes;
		if (diffMinutes < 0) return;

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		const timeString = [
			hours > 0 ? `${String(hours).padStart(2, '0')}h` : '0h',
			minutes > 0 ? `${String(minutes).padStart(2, '0')}m` : ''
		]
			.filter(Boolean)
			.join(' ');

		setTimeDifference(timeString);
	}, [endTime, startTime]);

	useEffect(() => {
		calculateTimeDifference();
	}, [calculateTimeDifference, endTime, startTime]);

	useEffect(() => {
		if (activeTeamTask) {
			setTaskId(activeTeamTask.id);
		}
		if (activeTeam) {
			setTeam(activeTeam);
		}
	}, [activeTeamTask, activeTeam]);

	useEffect(() => {
		if (!addManualTimeLoading && timeLog) {
			closeModal();
			setDescription('');
			setErrorMsg('');
		}
	}, [addManualTimeLoading, closeModal, timeLog]);

	const memberItemsLists = {
		Project: activeTeam?.projects as [],
		Employee: activeTeam?.members as [],
		Task: tasks
	};

	const selectedValues = {
		Teams: null,
		Members: null,
		Task: null
	};
	const fields = [
		{
			label: 'Project',
			placeholder: 'Select a project',
			isRequired: true,
			valueKey: 'id',
			displayKey: 'name',
			element: 'Project'
		},
		...(timeSheetStatus === 'ManagerTimesheet'
			? [
					{
						label: t('manualTime.EMPLOYEE'),
						placeholder: 'Select an employee',
						isRequired: true,
						valueKey: 'id',
						displayKey: 'employee.fullName',
						element: 'Employee'
					}
				]
			: []),
		{
			label: t('manualTime.TASK'),
			placeholder: 'Select a Task',
			isRequired: true,
			valueKey: 'id',
			displayKey: 'title',
			element: 'Task'
		}
	];

	const handleSelectedValuesChange = (values: { [key: string]: Item | null }) => {
		console.log(values);
	};

	const handleChange = (field: string, selectedItem: Item | null) => {
		console.log(`Field: ${field}, Selected Item:`, selectedItem);
	};

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={t('common.ADD_TIME')}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start"
			titleClass="font-bold"
		>
			<form onSubmit={handleSubmit} className="text-sm w-[90%] md:w-full  flex flex-col justify-between gap-4">
				<div className="flex flex-col">
					<label className="block mb-1 text-gray-500">
						{t('manualTime.DATE')}
						<span className="text-[#de5505e1] ml-1">*</span>
					</label>
					<DatePicker
						buttonVariant={'link'}
						className="dark:bg-dark--theme-light"
						buttonClassName={
							'decoration-transparent  w-full flex items-center w-full border-gray-300 justify-start text-left font-normal text-black  h-10 border  dark:border-slate-600 rounded-md"'
						}
						customInput={
							<>
								<CalendarDays className="w-5 h-5 dark:text-gray-700" />
								<Button
									variant={'outline'}
									className={cn(
										'w-[230px] justify-start text-left font-normal text-black  h-10 border border-transparent dark:border-transparent',
										!date && 'text-muted-foreground'
									)}
								>
									{date ? format(date, 'PPP') : <span>{t('manualTime.PICK_A_DATE')}</span>}
								</Button>
							</>
						}
						selected={date}
						onSelect={(value) => {
							value && setDate(value);
						}}
						mode={'single'}
					/>
				</div>

				<div className="flex items-center">
					<label className="block mr-2 text-gray-500">{t('pages.timesheet.BILLABLE.BILLABLE')}</label>
					<div
						className={`w-12 h-6 flex items-center bg-[#6c57f4b7] rounded-full p-1 cursor-pointer `}
						onClick={() => setIsBillable(!isBillable)}
						style={
							isBillable
								? { background: 'linear-gradient(to right, #9d91efb7, #8a7bedb7)' }
								: { background: '#6c57f4b7' }
						}
					>
						<div
							className={` bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform ${isBillable ? 'translate-x-6' : 'translate-x-0'}`}
						/>
					</div>
				</div>
				<div className="flex items-center">
					<div className=" w-[48%] mr-[4%]">
						<label className="block mb-1 text-gray-500">
							{t('manualTime.START_TIME')}
							<span className="text-[#de5505e1] ml-1">*</span>
						</label>
						<input
							type="time"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
							className="p-2 w-full font-normal rounded-md border border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
							required
						/>
					</div>

					<div className=" w-[48%]">
						<label className="block mb-1 text-gray-500">
							{t('manualTime.END_TIME')}
							<span className="text-[#de5505e1] ml-1">*</span>
						</label>

						<input
							type="time"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
							className="p-2 w-full font-normal rounded-md border border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
							required
						/>
					</div>
				</div>

				<div className="flex items-center">
					<label className="block mb-1 text-primary">
						{`${params === 'AddManuelTime' ? t('timer.TOTAL_HOURS') : t('manualTime.ADDED_HOURS')}`}:{' '}
					</label>
					<div className="ml-[10px] p-1 flex items-center font-semibold dark:border-regal-rose  pr-3">
						<div className="mr-[10px] bg-gradient-to-tl text-[#3826A6]  rounded-full ">
							<IoTime size={20} className="rounded-full text-primary dark:text-[#8a7bedb7]" />
						</div>
						{timeDifference}
					</div>
				</div>
				{params === 'AddManuelTime' ? (
					<>
						<ManageOrMemberComponent
							fields={fields}
							itemsLists={memberItemsLists}
							selectedValues={selectedValues}
							onSelectedValuesChange={handleSelectedValuesChange}
							handleChange={handleChange}
							itemToString={(item, displayKey) => getNestedValue(item, displayKey) || ''}
							itemToValue={(item, valueKey) => getNestedValue(item, valueKey) || ''}
						/>
						<div className="flex flex-col">
							<label className="block text-gray-500 shrink-0">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder="What did you worked on..."
								onChange={(e) => setDescription(e.target.value)}
								className="p-2 w-full h-32 rounded-md border border-gray-300 resize-none grow dark:border-slate-600 dark:bg-dark--theme-light"
							/>
						</div>
					</>
				) : (
					<>
						<div className="">
							<label className="block mb-1 text-gray-500">
								{t('manualTime.TEAM')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								defaultValue={activeTeam?.id ?? ''}
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="teams"
								className="w-full border-gray-300 dark:border-slate-600 dark:text-white"
								options={teams}
								onChange={(value) => {
									setTeam(value.id);
								}}
							/>

						</div>
						<div className="">
							<label className="block mb-1 text-gray-500">
								{t('manualTime.TASK')}
								<span className="text-[#de5505e1] ml-1">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								defaultValue={activeTeamTask?.id ?? ''}
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="task"
								className="w-full border-gray-300 dark:border-slate-600 dark:text-white"
								options={tasks}
								onChange={(value) => {
									setTaskId(value.id);
								}}
							/>
						</div>

						<div className="flex flex-col">
							<label className="block text-gray-500 shrink-0">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder="What worked on? "
								onChange={(e) => setDescription(e.target.value)}
								className="p-2 w-full h-32 rounded-md border border-gray-300 resize-none grow dark:border-slate-600 dark:bg-dark--theme-light"
							/>
						</div>

						<div className="">
							<label className="block mb-1 text-gray-500">
								{t('manualTime.REASON')} ({t('manualTime.OPTIONAL')})
							</label>
							<CustomSelect
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="REASON"
								className="w-full border-gray-300 dark:border-slate-600 dark:text-white"
								options={manualTimeReasons.map((reason) => t(`manualTime.reasons.${reason}`))}
								onChange={(value) => {
									setReason(value);
								}}
							/>
						</div>
					</>
				)}

				<div
					className={clsxm(
						'flex items-center w-full pt-2',
						params === 'AddManuelTime' ? 'justify-center' : 'justify-between'
					)}
				>
					<>
						{params === 'AddTime' && (
							<Button
								variant="outline"
								type="button"
								className="font-bold border-gray-300 dark:text-primary dark:border-slate-600 dark:bg-dark--theme-light"
							>
								{t('common.VIEW_TIMESHEET')}
							</Button>
						)}
						<Button
							loading={addManualTimeLoading}
							disabled={addManualTimeLoading}
							type="submit"
							className={clsxm(
								'bg-[#3826A6] font-bold flex items-center text-white',
								`${params === 'AddManuelTime' && 'w-full'}`
							)}
						>
							{t('common.ADD_TIME')}
						</Button>
					</>
				</div>
				{errorMsg && <div className="m-2 text-[#ff6a00de]">{errorMsg}</div>}
			</form>
		</Modal>
	);
}
