import '@/styles/style.css';

import { format } from 'date-fns';
import { Button, Modal, modalFooterClass, modalPrimaryActionClass, modalSecondaryActionClass } from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { Calendar, Clock } from '@/core/components/icons';
import { Input, controlGroupRecipe, controlRecipe } from '@/core/components/common/input';
import { DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { manualTimeReasons } from '@/core/constants/config/constants';
import { useManualTime } from '@/core/hooks/activities/use-manual-time';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { clsxm } from '@/core/lib/utils';
import { DatePicker } from '@/core/components/common/date-picker';
import { getNestedValue, Item, ManageOrMemberComponent } from '../../teams/manage-member-component';
import { CustomSelect } from '../../common/multiple-select';
import { IAddManualTimeRequest } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { TOrganizationTeam } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { activeTeamState, activeTeamTaskState, organizationTeamsState, tasksByTeamState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api/tasks/task.service';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';

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
	/** Where the entry starts when the dialog opens (a calendar slot); now when not given. */
	initialStart?: Date;
	/** Where the entry ends when the dialog opens; the start when not given. */
	initialEnd?: Date;
}

function clockTimeOf(date: Date) {
	return date.toTimeString().slice(0, 5);
}

/** Whether the listed task belongs to the team, so time is never saved with a team and a task of another team. */
function isTaskOfTeam(tasks: TTask[], taskId: string, teamId: string | undefined): boolean {
	if (!teamId) {
		return false;
	}
	const task = tasks.find((item) => item.id === taskId);
	const taskTeams = task?.teams ?? [];
	return taskTeams.some((taskTeam) => taskTeam?.id === teamId);
}

/** Whether the employee is a member of the team, matched like the Employee field reads a member's employee id. */
function isEmployeeOfTeam(team: TOrganizationTeam | null | undefined, employeeId: string): boolean {
	const members = team?.members ?? [];
	return members.some((member) => {
		const memberEmployeeId = member.employeeId ?? member.employee?.id;
		return memberEmployeeId === employeeId;
	});
}

export function AddManualTimeModal(props: Readonly<IAddManualTimeModalProps>) {
	const { closeModal, isOpen, params, timeSheetStatus, initialStart, initialEnd } = props;
	const t = useTranslations();
	const locale = useLocale();
	const [isBillable, setIsBillable] = useState<boolean>(false);
	const [description, setDescription] = useState<string>('');
	const [reason, setReason] = useState<string>('');
	const [errorMsg, setErrorMsg] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [date, setDate] = useState<Date>(new Date());
	const [startTime, setStartTime] = useState<string>('');
	const [team, setTeam] = useState<TOrganizationTeam>();
	const [taskId, setTaskId] = useState<string>('');
	const [projectId, setProjectId] = useState<string>('');
	const [employeeId, setEmployeeId] = useState<string>('');
	const isTaskPickedRef = useRef(false);
	const isTeamPickedRef = useRef(false);
	const [timeDifference, setTimeDifference] = useState<string>('');

	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const activeTeamTaskList = useAtomValue(tasksByTeamState);
	const activeTeam = useAtomValue(activeTeamState);
	const teams = useAtomValue(organizationTeamsState);
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const teamToSave = team ?? activeTeam;
	const accessToken = useReactiveAccessTokenCookie();

	// The store lists the active team's tasks only: a picked team that is not the active one gets its own list, read
	// as the team's task board reads it, so its tasks can be picked and saved with it
	const pickedTeamId = team?.id;
	const isOtherTeamPicked = !!pickedTeamId && pickedTeamId !== activeTeam?.id;
	const pickedTeamTasksQuery = useQuery({
		queryKey: queryKeys.tasks.byTeam(pickedTeamId),
		queryFn: ({ signal }) =>
			taskService.getTasks({
				projectId: team?.projects?.[0]?.id ?? '',
				options: {
					scope: {
						tenantId: team?.tenantId ?? user?.tenantId,
						organizationId: team?.organizationId,
						teamId: pickedTeamId,
						accessToken
					},
					signal
				}
			}),
		enabled: isOpen && isOtherTeamPicked && !!accessToken,
		staleTime: 60_000
	});
	// The picked team's tasks, with the active team's (a task can belong to both teams): its shared tasks can be
	// picked before its own list arrives, and every listed task carries the teams it belongs to
	const pickedTeamTaskItems = pickedTeamTasksQuery.data?.items;
	const tasks = useMemo(() => {
		if (!isOtherTeamPicked) return activeTeamTaskList;
		const pickedTeamTasks = pickedTeamTaskItems ?? [];
		const pickedTeamTaskIds = new Set(pickedTeamTasks.map((task) => task.id));
		const otherKnownTasks = activeTeamTaskList.filter((task) => !pickedTeamTaskIds.has(task.id));
		return [...pickedTeamTasks, ...otherKnownTasks];
	}, [isOtherTeamPicked, pickedTeamTaskItems, activeTeamTaskList]);

	const {
		addManualTime,
		addManualTimeLoading,
		addManualTimeSuccess,
		addManualTimeError,
		addManualTimeFailure,
		timeLog
	} = useManualTime();

	const initialRangeRef = useRef({ start: initialStart, end: initialEnd });

	useEffect(() => {
		const { start, end } = initialRangeRef.current;
		const startAt = start ?? new Date();
		const endAt = end ?? startAt;

		setDate(startAt);
		setStartTime(clockTimeOf(startAt));
		setEndTime(clockTimeOf(endAt));
	}, []);

	// Picks are only sent when set, so an empty pick keeps the hook defaults
	const pickedFields = useMemo(
		() => ({ ...(projectId && { projectId }), ...(employeeId && { employeeId }) }),
		[projectId, employeeId]
	);

	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			// Clear any previous error messages before validation
			setErrorMsg('');

			const startedAt = new Date(date);
			const stoppedAt = new Date(date);

			// Set time for the started date
			startedAt.setHours(parseInt(startTime.split(':')[0]));
			startedAt.setMinutes(parseInt(startTime.split(':')[1]));

			// Set time for the stopped date
			stoppedAt.setHours(parseInt(endTime.split(':')[0]));
			stoppedAt.setMinutes(parseInt(endTime.split(':')[1]));

			const requestData: Omit<IAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'> & {
				employeeId?: string;
			} = {
				startedAt,
				stoppedAt,
				taskId,
				description,
				reason,
				isBillable,
				organizationId: team?.organizationId,
				organizationTeamId: teamToSave?.id,
				...pickedFields
			};

			// Improved validation with better error messages
			const isValidForm = date && startTime && endTime && (team || activeTeam) && taskId;

			if (!isValidForm) {
				const missingFields = [];
				if (!date) missingFields.push(t('manualTime.DATE'));
				if (!startTime) missingFields.push(t('manualTime.START_TIME'));
				if (!endTime) missingFields.push(t('manualTime.END_TIME'));
				if (!team && !activeTeam) missingFields.push(t('manualTime.TEAM'));
				if (!taskId) missingFields.push(t('manualTime.TASK'));

				const fields = new Intl.ListFormat(locale, { type: 'conjunction' }).format(missingFields);
				setErrorMsg(t('manualTime.FILL_IN', { fields }));
				return;
			}

			// The task must be one the saved team lists: after an active team switch from another tab, the task
			// picked before it belongs to the previous team
			const isTaskOfTeamToSave = isTaskOfTeam(tasks, taskId, teamToSave?.id);
			if (!isTaskOfTeamToSave) {
				setErrorMsg(t('manualTime.FILL_IN', { fields: t('manualTime.TASK') }));
				return;
			}

			// Same for an employee picked in the Calendar dialog: a member of the previous team is not sent
			const hasPickedEmployee = employeeId !== '';
			const isEmployeeOfTeamToSave = isEmployeeOfTeam(teamToSave, employeeId);
			if (hasPickedEmployee && !isEmployeeOfTeamToSave) {
				setErrorMsg(t('manualTime.FILL_IN', { fields: t('manualTime.EMPLOYEE') }));
				return;
			}

			if (endTime <= startTime) {
				setErrorMsg(t('manualTime.END_AFTER_START'));
				return;
			}

			// All validation passed, submit the request
			addManualTime(requestData);
		},
		[
			addManualTime,
			date,
			description,
			endTime,
			isBillable,
			reason,
			startTime,
			taskId,
			pickedFields,
			team,
			activeTeam,
			teamToSave,
			tasks,
			employeeId,
			t,
			locale
		]
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

	// Handle successful manual time addition - only close modal on confirmed success
	useEffect(() => {
		if (addManualTimeSuccess && timeLog) {
			// Close modal and reset form only on success
			closeModal();
			setDescription('');
			setErrorMsg('');
			setReason('');
			setIsBillable(false);
		}
	}, [addManualTimeSuccess, timeLog, closeModal]);

	// Handle manual time addition errors - keep modal open and show error
	useEffect(() => {
		if (addManualTimeError && addManualTimeFailure) {
			// The reason in words, never the server's own text
			const reasonKey = errorReasonKeyOf(addManualTimeFailure) as DottedLanguageObjectStringPaths;
			setErrorMsg(t(reasonKey));
		}
	}, [addManualTimeError, addManualTimeFailure, t]);

	// Reset states when modal opens - use ref to prevent infinite loops
	const isOpenRef = useRef(isOpen);
	const hasResetRef = useRef(false);

	useEffect(() => {
		// Only reset when modal transitions from closed to open
		if (isOpen && !isOpenRef.current && !hasResetRef.current) {
			// Clear any previous error states
			setErrorMsg('');
			// Mark that we've reset to prevent multiple resets
			hasResetRef.current = true;
		}

		// Reset the flag when modal closes
		if (!isOpen && isOpenRef.current) {
			hasResetRef.current = false;
		}

		isOpenRef.current = isOpen;
	}, [isOpen]);

	// Simplified task validation for performance
	const isValidTask = useCallback((task: any): task is TTask => {
		return task?.id && task?.title && Array.isArray(task?.teams);
	}, []);

	// Simplified team filtering functions for performance
	const isTaskInActiveTeam = useCallback((task: TTask, teamId: string | undefined): boolean => {
		return Boolean(teamId && task.teams?.some((team: any) => team?.id === teamId));
	}, []);

	const isTaskInSelectedTeam = useCallback((task: TTask, selectedTeamId: string | undefined): boolean => {
		return Boolean(selectedTeamId && task.teams?.some((team: any) => team?.id === selectedTeamId));
	}, []);

	const isTaskAssignedToUser = useCallback((task: TTask, userId: string | undefined): boolean => {
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
		(tasks: TTask[], teamId: string | undefined, filterByTeam: (task: TTask, teamId: string) => boolean) => {
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
		() => filterTasksByTeamAndRole(activeTeamTaskList, activeTeam?.id, isTaskInActiveTeam),
		[activeTeamTaskList, activeTeam?.id, filterTasksByTeamAndRole, isTaskInActiveTeam]
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
				// A task picked in the form must not be replaced by the active task when the task list refreshes,
				// and the active task belongs to the active team, not to a team picked in the form
				const isPickedInForm = isTaskPickedRef.current || isTeamPickedRef.current;
				if (!isPickedInForm) {
					setTaskId(activeTeamTask.id);
				}
			} else if (process.env.NODE_ENV === 'development') {
				console.warn('🚨 activeTeamTask not available in filtered tasks:', {
					activeTeamTaskId: activeTeamTask.id,
					activeTeamTaskTitle: activeTeamTask.title,
					availableTaskIds: activeTeamTasks.map((t) => t.id)
				});
			}
		}
		// A team picked in the form must not be replaced by the active team when the lists refresh
		if (activeTeam && !isTeamPickedRef.current) {
			setTeam(activeTeam);
		}
	}, [activeTeamTask, activeTeam, activeTeamTasks]);

	const memberItemsLists = useMemo(() => {
		return {
			Project: (activeTeam?.projects || []).filter(isValidProject),
			Employee: (activeTeam?.members || []).filter(isValidEmployee),
			Task: activeTeamTasks // Only tasks from active team
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
		if (field === 'Project') {
			setProjectId(selectedItem?.id ?? '');
		} else if (field === 'Employee') {
			// Employee items are team member rows, whose own id is not the employee id
			setEmployeeId(selectedItem?.employeeId ?? selectedItem?.employee?.id ?? '');
		} else if (field === 'Task') {
			isTaskPickedRef.current = true;
			setTaskId(selectedItem?.id ?? '');
		}
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
			breadcrumb={activeTeam?.name}
			className="w-full md:w-40 md:min-w-[24rem] h-[auto] justify-start"
		>
			<form onSubmit={handleSubmit} className="text-sm w-[90%] md:w-full flex flex-col justify-between gap-4">
				<div className="flex flex-col">
					<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
						{t('manualTime.DATE')}
						<span className="ml-1 text-destructive-ink">*</span>
					</label>
					<DatePicker
						buttonVariant={'link'}
						//@ts-ignore
						className="bg-popover"
						buttonClassName={cn(
							controlGroupRecipe,
							'decoration-transparent h-9 justify-start gap-2 px-2.5 text-left font-normal text-foreground'
						)}
						customInput={
							<>
								<Calendar className="size-4 shrink-0 text-muted-foreground" />
								<Button
									variant="ghost"
									size="default"
									className={cn(
										'w-[230px] justify-start px-0 text-left text-sm font-normal text-foreground hover:bg-transparent',
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
					<div className=" w-[48%] mr-[4%]">
						<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
							{t('manualTime.START_TIME')}
							<span className="ml-1 text-destructive-ink">*</span>
						</label>
						<Input
							type="time"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
							className="tabular-nums"
							required
						/>
					</div>

					<div className=" w-[48%]">
						<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
							{t('manualTime.END_TIME')}
							<span className="ml-1 text-destructive-ink">*</span>
						</label>

						<Input
							type="time"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
							className="tabular-nums"
							required
						/>
					</div>
				</div>
				<div className="flex justify-between">
					<div className="flex items-center">
						<label className="mr-2 block text-[13px] text-foreground">
							{t('pages.timesheet.BILLABLE.BILLABLE')}
						</label>
						<div
							className={clsxm(
								'flex h-6 w-10.5 shrink-0 cursor-pointer items-center rounded-full p-0.5 hairline-ring ring-foreground/10 transition-colors dark:ring-foreground/15',
								isBillable && 'bg-primary',
								!isBillable && 'bg-foreground/10'
							)}
							onClick={() => setIsBillable(!isBillable)}
						>
							<div
								className={clsxm(
									'size-4.5 rounded-full bg-white shadow-sm shadow-black/15 transition-transform duration-200',
									isBillable && 'translate-x-4.5'
								)}
							/>
						</div>
					</div>

					<div className="flex items-center">
						<label className="block text-xs text-muted-foreground">
							{`${params === 'AddManuelTime' ? t('timer.TOTAL_HOURS') : t('manualTime.ADDED_HOURS')}`}
							:{' '}
						</label>
						<div className="ml-2 flex items-center gap-1.5 text-sm font-semibold tabular-nums">
							<div className="text-muted-foreground">
								<Clock className="size-4" />
							</div>
							{timeDifference}
						</div>
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
							<label className="mb-1.5 block shrink-0 text-xs font-medium leading-none text-muted-foreground">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder={t('modals.manualTime.descriptionPlaceholder')}
								onChange={(e) => setDescription(e.target.value)}
								className={cn(controlRecipe, 'h-32 w-full grow resize-none p-3')}
							/>
						</div>
					</>
				) : (
					<>
						<div className="">
							<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
								{t('manualTime.TEAM')}
								<span className="ml-1 text-destructive-ink">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								// Shows the team the time is saved with, also when the active team changes under the form
								value={teamToSave?.id ?? ''}
								classNameGroup="max-h-[40vh]"
								ariaLabel="teams"
								className="w-full text-sm"
								options={teams}
								onChange={(value) => {
									// CustomSelect passes the picked team's id
									const pickedTeam = teams.find((item) => item.id === value);
									isTeamPickedRef.current = true;
									setTeam(pickedTeam); // Set the full team object, not just ID
									// A task of the previous team must not be saved with the picked team
									const pickedTeamTasks = filterTasksByTeamAndRole(
										tasks,
										pickedTeam?.id,
										isTaskInSelectedTeam
									);
									const isTaskInPickedTeam = pickedTeamTasks.some((task) => task.id === taskId);
									if (!isTaskInPickedTeam) {
										setTaskId('');
									}
								}}
							/>
						</div>
						<div className="">
							<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
								{t('manualTime.TASK')}
								<span className="ml-1 text-destructive-ink">*</span>
							</label>
							<CustomSelect
								valueKey="id"
								// Controlled, so a task cleared on a team change is cleared in the select too
								value={taskId}
								classNameGroup="max-h-[40vh] overflow-x-hidden max-w-[420px]"
								ariaLabel="task"
								className="w-full text-sm"
								options={team ? selectedTeamTasks : activeTeamTasks}
								renderOption={(task: TTask) => {
									return task?.title ?? task?.label ?? '(no-title)';
								}}
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
									isTaskPickedRef.current = true;
									setTaskId(value);
								}}
							/>
						</div>

						<div className="flex flex-col">
							<label className="mb-1.5 block shrink-0 text-xs font-medium leading-none text-muted-foreground">
								{t('manualTime.DESCRIPTION')} ({t('manualTime.OPTIONAL')})
							</label>
							<textarea
								value={description}
								placeholder={t('modals.manualTime.descriptionPlaceholder')}
								onChange={(e) => setDescription(e.target.value)}
								className={cn(controlRecipe, 'min-h-20 w-full grow resize-none p-3')}
							/>
						</div>

						<div className="">
							<label className="mb-1.5 block text-xs font-medium leading-none text-muted-foreground">
								{t('manualTime.REASON')} ({t('manualTime.OPTIONAL')})
							</label>
							<CustomSelect
								classNameGroup="max-h-[40vh]"
								ariaLabel="REASON"
								className="w-full text-sm"
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

				<div className={modalFooterClass}>
					{params === 'AddTime' && (
						<Button variant="ghost" size="default" className={modalSecondaryActionClass} type="button">
							{t('common.VIEW_TIMESHEET')}
						</Button>
					)}
					<Button
						loading={addManualTimeLoading}
						disabled={addManualTimeLoading}
						type="submit"
						size="default"
						className={modalPrimaryActionClass}
					>
						{t('common.ADD_TIME')}
					</Button>
				</div>
				{errorMsg && <div className="m-2 text-xs text-destructive-ink">{errorMsg}</div>}
			</form>
		</Modal>
	);
}
