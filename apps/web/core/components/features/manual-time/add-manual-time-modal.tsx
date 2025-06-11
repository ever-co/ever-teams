/* eslint-disable @typescript-eslint/no-unused-vars */
import '@/styles/style.css';

import { format } from 'date-fns';
import { Button, Modal } from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { CalendarDays, Clock7 } from 'lucide-react';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { manualTimeReasons } from '@/core/constants/config/constants';
import { useOrganizationTeams, useTeamTasks } from '@/core/hooks';
import { useManualTime } from '@/core/hooks/activities/use-manual-time';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { ITask } from '@/core/types/interfaces/task/task';
import { clsxm } from '@/core/lib/utils';
import { DatePicker } from '@/core/components/common/date-picker';
import { getNestedValue, Item, ManageOrMemberComponent } from '../../teams/manage-member-component';
import { CustomSelect } from '../../common/multiple-select';
import { IAddManualTimeRequest } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { TOrganizationTeam } from '@/core/types/schemas';

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
	const [team, setTeam] = useState<TOrganizationTeam>();
	const [taskId, setTaskId] = useState<string>('');
	const [timeDifference, setTimeDifference] = useState<string>('');
	const { activeTeamTask, tasks, activeTeam } = useTeamTasks();
	const { teams } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { isTeamManager } = useIsMemberManager(user);

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

			// Improved validation with better error messages
			const isValidForm = date && startTime && endTime && (team || activeTeam) && taskId;

			// Debug validation in development
			if (process.env.NODE_ENV === 'development') {
				console.log('🔧 Form validation:', {
					date: !!date,
					startTime: !!startTime,
					endTime: !!endTime,
					team: !!team,
					activeTeam: !!activeTeam,
					taskId: !!taskId,
					taskIdValue: taskId,
					isValidForm
				});
			}

			if (!isValidForm) {
				const missingFields = [];
				if (!date) missingFields.push('Date');
				if (!startTime) missingFields.push('Start Time');
				if (!endTime) missingFields.push('End Time');
				if (!team && !activeTeam) missingFields.push('Team');
				if (!taskId) missingFields.push('Task');

				setErrorMsg(`Please complete: ${missingFields.join(', ')}`);
				return;
			}

			if (endTime <= startTime) {
				setErrorMsg('End time must be after start time');
				return;
			}

			addManualTime(requestData);
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

	// This useEffect will be moved after activeTeamTasks declaration

	useEffect(() => {
		if (!addManualTimeLoading && timeLog) {
			closeModal();
			setDescription('');
			setErrorMsg('');
		}
	}, [addManualTimeLoading, closeModal, timeLog]);

	// Simplified task validation for performance
	const isValidTask = useCallback((task: any): task is ITask => {
		return task?.id && task?.title && Array.isArray(task?.teams);
	}, []);

	// Simplified team filtering functions for performance
	const isTaskInActiveTeam = useCallback((task: ITask, teamId: string | undefined): boolean => {
		return Boolean(teamId && task.teams?.some((team: any) => team?.id === teamId));
	}, []);

	const isTaskInSelectedTeam = useCallback((task: ITask, selectedTeamId: string | undefined): boolean => {
		return Boolean(selectedTeamId && task.teams?.some((team: any) => team?.id === selectedTeamId));
	}, []);

	const isTaskAssignedToUser = useCallback((task: ITask, userId: string | undefined): boolean => {
		return Boolean(userId && task.members?.some((member: any) => member?.userId === userId));
	}, []);

	// Simplified validation functions for performance
	const isValidProject = useCallback((project: any): boolean => {
		return project?.id && project?.name;
	}, []);

	const isValidEmployee = useCallback((employee: any): boolean => {
		return employee?.id && employee?.employee?.fullName;
	}, []);
	const filterTasksByTeamAndRole = useCallback(
		(tasks: any[], teamId: string | undefined, filterByTeam: (task: ITask, teamId: string) => boolean) => {
			if (!tasks || !Array.isArray(tasks) || !teamId) {
				return [];
			}

			const validTasks = tasks.filter(isValidTask);
			const teamFilteredTasks = validTasks.filter((task) => filterByTeam(task, teamId));

			const finalFilteredTasks = isTeamManager
				? teamFilteredTasks
				: teamFilteredTasks.filter((task) => isTaskAssignedToUser(task, user?.id));

			// Debug logging...

			return finalFilteredTasks;
		},
		[isValidTask, isTeamManager, isTaskAssignedToUser, user?.id]
	);

	// Get tasks filtered by active team
	const activeTeamTasks = useMemo(
		() => filterTasksByTeamAndRole(tasks, activeTeam?.id, isTaskInActiveTeam),
		[tasks, activeTeam?.id, filterTasksByTeamAndRole, isTaskInActiveTeam]
	);

	// Get tasks filtered by selected team and assigned to current user (for team selection mode)
	const selectedTeamTasks = useMemo(
		() => filterTasksByTeamAndRole(tasks, team?.id, isTaskInSelectedTeam),
		[tasks, team?.id, filterTasksByTeamAndRole, isTaskInSelectedTeam]
	);

	// Initialize taskId when activeTeamTask changes (after activeTeamTasks is available)
	useEffect(() => {
		if (activeTeamTask) {
			// Only set taskId if the task is valid and available in filtered tasks
			const isTaskAvailable = activeTeamTasks.some((task) => task.id === activeTeamTask.id);
			if (isTaskAvailable) {
				setTaskId(activeTeamTask.id);
			} else if (process.env.NODE_ENV === 'development') {
				console.warn('🚨 activeTeamTask not available in filtered tasks:', {
					activeTeamTaskId: activeTeamTask.id,
					activeTeamTaskTitle: activeTeamTask.title,
					availableTaskIds: activeTeamTasks.map((t) => t.id)
				});
			}
		}
		if (activeTeam) {
			setTeam(activeTeam);
		}
	}, [activeTeamTask, activeTeam, activeTeamTasks]);

	const memberItemsLists = useMemo(() => {
		return {
			Project: (activeTeam?.projects || []).filter(isValidProject),
			Employee: (activeTeam?.members || []).filter(isValidEmployee),
			Task: activeTeamTasks // ✅ Only tasks from active team
		};
	}, [activeTeam?.projects, activeTeam?.members, activeTeamTasks, isValidProject, isValidEmployee]);

	const selectedValues = useMemo(
		() => ({
			Teams: null,
			Members: null,
			Task: null
		}),
		[]
	);
	const fields = useMemo(
		() => [
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
		],
		[timeSheetStatus, t]
	);

	const handleSelectedValuesChange = useCallback((values: { [key: string]: Item | null }) => {
		console.log(values);
	}, []);

	const handleChange = useCallback((field: string, selectedItem: Item | null) => {
		console.log(`Field: ${field}, Selected Item:`, selectedItem);
	}, []);

	const itemToString = useCallback(
		(item: Item | null, displayKey: string) => getNestedValue(item, displayKey) || '',
		[]
	);

	const itemToValue = useCallback((item: Item | null, valueKey: string) => getNestedValue(item, valueKey) || '', []);

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			title={t('common.ADD_TIME')}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start"
			titleClass="font-bold"
		>
			<form onSubmit={handleSubmit} className="text-sm w-[90%] md:w-full  flex flex-col justify-between gap-2.5">
				<div className="flex flex-col">
					<label className="block mb-1 text-xs text-gray-500">
						{t('manualTime.DATE')}
						<span className="text-[#de5505e1] ml-1 text-xs">*</span>
					</label>
					<DatePicker
						buttonVariant={'link'}
						//@ts-ignore
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
										'w-[230px] justify-start text-left font-normal text-black  h-10 border border-transparent dark:border-transparent text-sm',
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
					<label className="block mr-2 text-xs text-gray-500">{t('pages.timesheet.BILLABLE.BILLABLE')}</label>
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
						<label className="block mb-1 text-xs text-gray-500">
							{t('manualTime.START_TIME')}
							<span className="text-[#de5505e1] ml-1 text-xs">*</span>
						</label>
						<input
							type="time"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
							className="w-full p-2 text-sm font-normal border rounded-md border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
							required
						/>
					</div>

					<div className=" w-[48%]">
						<label className="block mb-1 text-xs text-gray-500">
							{t('manualTime.END_TIME')}
							<span className="text-[#de5505e1] ml-1 text-xs">*</span>
						</label>

						<input
							type="time"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
							className="w-full p-2 font-normal border rounded-md border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light"
							required
						/>
					</div>
				</div>

				<div className="flex items-center">
					<label className="block mb-1 text-xs text-primary">
						{`${params === 'AddManuelTime' ? t('timer.TOTAL_HOURS') : t('manualTime.ADDED_HOURS')}`}:{' '}
					</label>
					<div className="ml-[10px] p-1 flex items-center font-semibold text-sm dark:border-regal-rose  pr-3">
						<div className="mr-[10px] bg-gradient-to-tl text-[#3826A6]  rounded-full ">
							<Clock7 size={20} className="rounded-full text-primary dark:text-[#8a7bedb7]" />
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
							itemToString={itemToString}
							itemToValue={itemToValue}
						/>
						<div className="flex flex-col">
							<label className="block text-xs text-gray-500 shrink-0">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder="What did you worked on..."
								onChange={(e) => setDescription(e.target.value)}
								className="w-full h-32 p-2 border border-gray-300 rounded-md resize-none grow dark:border-slate-600 dark:bg-dark--theme-light"
							/>
						</div>
					</>
				) : (
					<>
						<div className="">
							<label className="block mb-1 text-xs text-gray-500">
								{t('manualTime.TEAM')}
								<span className="text-[#de5505e1] ml-1 text-xs">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								defaultValue={activeTeam?.id ?? ''}
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="teams"
								className="w-full text-sm border-gray-300 dark:border-slate-600 dark:text-white"
								options={teams}
								onChange={(value) => {
									setTeam(value); // Set the full team object, not just ID
								}}
							/>
						</div>
						<div className="">
							<label className="block mb-1 text-xs text-gray-500">
								{t('manualTime.TASK')}
								<span className="text-[#de5505e1] ml-1 text-xs">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								defaultValue={taskId || ''}
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="task"
								className="w-full text-sm border-gray-300 dark:border-slate-600 dark:text-white"
								options={team ? selectedTeamTasks : activeTeamTasks}
								onChange={(value) => {
									// CustomSelect returns the ID directly when valueKey="id"
									if (process.env.NODE_ENV === 'development') {
										console.log('🔧 Task selected:', {
											value,
											type: typeof value,
											availableOptions: (team ? selectedTeamTasks : activeTeamTasks).length,
											optionIds: (team ? selectedTeamTasks : activeTeamTasks).map((t) => t.id)
										});
									}
									setTaskId(value);
								}}
							/>
						</div>

						<div className="flex flex-col">
							<label className="block text-xs text-gray-500 shrink-0">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder="What worked on? "
								onChange={(e) => setDescription(e.target.value)}
								className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none min-h-20 grow dark:border-slate-600 dark:bg-dark--theme-light"
							/>
						</div>

						<div className="">
							<label className="block mb-1 text-xs text-gray-500">
								{t('manualTime.REASON')} ({t('manualTime.OPTIONAL')})
							</label>
							<CustomSelect
								classNameGroup="max-h-[40vh] dark:!text-white "
								ariaLabel="REASON"
								className="w-full text-sm border-gray-300 dark:border-slate-600 dark:text-white"
								options={manualTimeReasons.map((reason) =>
									t(`manualTime.reasons.${reason}` as DottedLanguageObjectStringPaths)
								)}
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
								className="text-sm font-medium border-gray-300 dark:text-primary dark:border-slate-600 dark:bg-dark--theme-light"
							>
								{t('common.VIEW_TIMESHEET')}
							</Button>
						)}
						<Button
							loading={addManualTimeLoading}
							disabled={addManualTimeLoading}
							type="submit"
							className={clsxm(
								'bg-[#3826A6] font-medium flex items-center text-sm text-white',
								`${params === 'AddManuelTime' && 'w-full'}`
							)}
						>
							{t('common.ADD_TIME')}
						</Button>
					</>
				</div>
				{errorMsg && <div className="m-2 text-[#ff6a00de] text-xs">{errorMsg}</div>}
			</form>
		</Modal>
	);
}
