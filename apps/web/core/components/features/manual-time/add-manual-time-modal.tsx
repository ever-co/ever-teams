import '@/styles/style.css';

import {
	Button,
	Modal,
	modalFieldLabelClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { Calendar, CircleAlert } from '@/core/components/icons';
import { Input, controlGroupRecipe, controlRecipe } from '@/core/components/common/input';
import { BillableSwitch } from '@/core/components/common/billable-switch';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { manualTimeRefusalKeyOf, minutesOfClockText } from '@/core/lib/utils/dashboards/manual-time-entry';
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { manualTimeReasons } from '@/core/constants/config/constants';
import { useManualTime } from '@/core/hooks/activities/use-manual-time';
import { useTimeOverlapGuard } from '@/core/hooks/timesheet/use-time-overlap-guard';
import { useOpenSession } from '@/core/hooks/common/use-open-session';
import { TimeOverlapCheckError, TimeOverlapConfirmDialog } from './time-overlap-confirm-dialog';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { DatePicker } from '@/core/components/common/date-picker';
import { DurationField } from './duration-field';
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
import type { CheckTimeEntrySave, TimeEntryCopy, TimeWindow } from '@/core/lib/utils/time-entry-reuse';
import { useDurationEntry } from '@/core/hooks/timesheet/use-duration-entry';

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
	/** The task, notes and billable status of a copied entry, which the dialog opens with. */
	prefill?: Pick<TimeEntryCopy, 'taskId' | 'description' | 'isBillable'>;
	/** Asked before the entry is saved: a returned message refuses the save and is shown in the dialog. */
	checkBeforeSave?: CheckTimeEntrySave;
}

function clockTimeOf(date: Date) {
	return date.toTimeString().slice(0, 5);
}

const DESCRIPTION_FIELD_CLASS_NAME = 'field-sizing-content max-h-[6lh] min-h-20 w-full resize-none p-3';

const PICKER_LABEL_CLASS_NAME = 'mb-1.5 leading-none';

function dateLabelOf(date: Date | undefined, locale: string, placeholder: string): string {
	if (!date) {
		return placeholder;
	}
	const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
	return formatter.format(date);
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
	const { closeModal, isOpen, params, timeSheetStatus, initialStart, initialEnd, prefill, checkBeforeSave } = props;
	const t = useTranslations();
	const locale = useLocale();
	const [isBillable, setIsBillable] = useState<boolean>(prefill?.isBillable ?? false);
	const [description, setDescription] = useState<string>(prefill?.description ?? '');
	const [isCheckingSave, setIsCheckingSave] = useState(false);
	const [reason, setReason] = useState<string>('');
	const [errorMsg, setErrorMsg] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [date, setDate] = useState<Date>(new Date());
	const [startTime, setStartTime] = useState<string>('');
	const [team, setTeam] = useState<TOrganizationTeam>();
	const [taskId, setTaskId] = useState<string>('');
	const [projectId, setProjectId] = useState<string>('');
	const [employeeId, setEmployeeId] = useState<string>('');
	// A copied entry keeps its own task or none: the active task never stands in for it
	const copiedTaskId = prefill?.taskId ?? '';
	const isTaskPickedRef = useRef(copiedTaskId !== '');
	const isTeamPickedRef = useRef(false);

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
	const overlapGuard = useTimeOverlapGuard({ isOpen });
	const saveAfterOverlapCheck = overlapGuard.saveAfterCheck;
	const ownEmployeeId = user?.employee?.id ?? '';

	const isSaving = addManualTimeLoading || overlapGuard.isChecking || isCheckingSave;
	const openSessionOf = useOpenSession(isOpen);

	const startTimeId = useId();
	const endTimeId = useId();
	const descriptionId = useId();
	const dateLabel = dateLabelOf(date, locale, t('manualTime.PICK_A_DATE'));
	const optionalLabel = t('manualTime.OPTIONAL');

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

	const savedEmployeeId = employeeId || ownEmployeeId;

	/** Saves once the dialog's opener has nothing against the interval (a copied entry may not run over another). */
	const saveUnlessRefused = useCallback(
		async (period: TimeWindow, save: () => void) => {
			if (!checkBeforeSave) {
				save();
				return;
			}
			const session = openSessionOf();
			setIsCheckingSave(true);
			let refusal: string | null;
			try {
				refusal = await checkBeforeSave({ employeeId: savedEmployeeId, periods: [period] });
			} finally {
				setIsCheckingSave(false);
			}
			// Closed while the check ran: the copy is not saved behind the person's back
			const wasDismissed = session !== openSessionOf();
			if (wasDismissed) {
				return;
			}
			if (refusal) {
				setErrorMsg(refusal);
				return;
			}
			save();
		},
		[checkBeforeSave, openSessionOf, savedEmployeeId]
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

			// The times are picked to the minute, and a proposed interval ends where the next entry starts: the
			// seconds of the moment the dialog opened must not carry the entry over it
			startedAt.setSeconds(0, 0);
			stoppedAt.setSeconds(0, 0);

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

			const period = { start: startedAt, end: stoppedAt };
			// A copied entry is refused over another entry; any other time over recorded time asks first
			void saveUnlessRefused(period, () =>
				saveAfterOverlapCheck({
					employeeId: savedEmployeeId,
					periods: [period],
					save: () => addManualTime(requestData)
				})
			);
		},
		[
			addManualTime,
			saveUnlessRefused,
			saveAfterOverlapCheck,
			savedEmployeeId,
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

	const showInterval = useCallback((interval: TimeWindow | null) => {
		if (!interval) {
			setStartTime('');
			setEndTime('');
			return;
		}
		setStartTime(clockTimeOf(interval.start));
		setEndTime(clockTimeOf(interval.end));
	}, []);

	const signedInEmployeeId = user?.employee?.id ?? null;
	const durationEntry = useDurationEntry({
		employeeId: employeeId || signedInEmployeeId,
		day: date,
		startMinutes: minutesOfClockText(startTime),
		endMinutes: minutesOfClockText(endTime),
		onInterval: showInterval
	});

	// While the duration field refuses its text the start and the end are still the earlier ones: they are not saved
	// in place of the duration it reports. Enter in another field submits the form too, hence the check here as well.
	const submitUnlessDurationRefused = (event: FormEvent<HTMLFormElement>) => {
		if (durationEntry.blocksSave) {
			event.preventDefault();
			return;
		}
		handleSubmit(event);
	};

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
			const reasonKey = manualTimeRefusalKeyOf(addManualTimeFailure) as DottedLanguageObjectStringPaths;
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

	// A copied entry's task is picked once the list offers it: one the member can no longer pick stays unpicked
	const isCopiedTaskOffered = useMemo(
		() => activeTeamTasks.some((task) => task.id === copiedTaskId),
		[activeTeamTasks, copiedTaskId]
	);
	useEffect(() => {
		if (isCopiedTaskOffered) {
			setTaskId((current) => current || copiedTaskId);
		}
	}, [copiedTaskId, isCopiedTaskOffered]);

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
				label: t('modals.manualTime.PROJECT'),
				placeholder: t('common.SELECT_A_PROJECT'),
				isRequired: true,
				valueKey: 'id',
				displayKey: 'name',
				element: 'Project'
			},
			...(timeSheetStatus === 'ManagerTimesheet'
				? [
						{
							label: t('manualTime.EMPLOYEE'),
							placeholder: t('modals.manualTime.SELECT_EMPLOYEE'),
							isRequired: true,
							valueKey: 'id',
							displayKey: 'employee.fullName',
							element: 'Employee'
						}
					]
				: []),
			{
				label: t('manualTime.TASK'),
				placeholder: t('modals.manualTime.SELECT_TASK'),
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
			className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto"
		>
			<form onSubmit={submitUnlessDurationRefused} className="flex w-full flex-col gap-4 text-sm">
				<div className="flex flex-col gap-2">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
						<div className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
							<DialogFieldLabel isRequired>{t('manualTime.DATE')}</DialogFieldLabel>
							<DatePicker
								buttonVariant={'link'}
								//@ts-ignore
								className="bg-popover"
								buttonClassName={cn(
									controlGroupRecipe,
									'decoration-transparent h-9 w-full justify-start gap-2 px-2.5 text-left font-normal text-foreground'
								)}
								customInput={
									<span className="flex min-w-0 items-center gap-2">
										<span className="sr-only">{t('manualTime.DATE')}</span>
										<Calendar
											className="size-4 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
										<span className="truncate text-sm tabular-nums">{dateLabel}</span>
									</span>
								}
								selected={date}
								onSelect={(value) => {
									value && setDate(value);
								}}
								mode={'single'}
							/>
						</div>
						<div className="flex min-w-0 flex-col">
							<DialogFieldLabel htmlFor={startTimeId} isRequired>
								{t('manualTime.START_TIME')}
							</DialogFieldLabel>
							<Input
								id={startTimeId}
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								className="tabular-nums"
								required
							/>
						</div>
						<div className="flex min-w-0 flex-col">
							<DialogFieldLabel htmlFor={endTimeId} isRequired>
								{t('manualTime.END_TIME')}
							</DialogFieldLabel>
							<Input
								id={endTimeId}
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								className="tabular-nums"
								required
							/>
						</div>
					</div>
					<DurationField entry={durationEntry} />
				</div>
				{params === 'AddManuelTime' ? (
					<>
						<ManageOrMemberComponent
							className="flex flex-col gap-4"
							fieldClassName="mb-0"
							labelClassName={cn(modalFieldLabelClass, PICKER_LABEL_CLASS_NAME)}
							classNameTitle="text-xs"
							fields={fields}
							itemsLists={memberItemsLists}
							selectedValues={selectedValues}
							onSelectedValuesChange={handleSelectedValuesChange}
							handleChange={handleChange}
							itemToString={itemToString}
							itemToValue={itemToValue}
						/>
						<div className="flex flex-col">
							<DialogFieldLabel htmlFor={descriptionId} optionalLabel={optionalLabel}>
								{t('manualTime.DESCRIPTION')}
							</DialogFieldLabel>
							<textarea
								id={descriptionId}
								value={description}
								placeholder={t('modals.manualTime.descriptionPlaceholder')}
								onChange={(e) => setDescription(e.target.value)}
								className={cn(controlRecipe, DESCRIPTION_FIELD_CLASS_NAME)}
							/>
						</div>
					</>
				) : (
					<>
						<div className="flex flex-col">
							<DialogFieldLabel isRequired>{t('manualTime.TEAM')}</DialogFieldLabel>
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
						<div className="flex flex-col">
							<DialogFieldLabel isRequired>{t('manualTime.TASK')}</DialogFieldLabel>
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
							<DialogFieldLabel htmlFor={descriptionId} optionalLabel={optionalLabel}>
								{t('manualTime.DESCRIPTION')}
							</DialogFieldLabel>
							<textarea
								id={descriptionId}
								value={description}
								placeholder={t('modals.manualTime.descriptionPlaceholder')}
								onChange={(e) => setDescription(e.target.value)}
								className={cn(controlRecipe, DESCRIPTION_FIELD_CLASS_NAME)}
							/>
						</div>

						<div className="flex flex-col">
							<DialogFieldLabel optionalLabel={optionalLabel}>{t('manualTime.REASON')}</DialogFieldLabel>
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

				{errorMsg && (
					<p role="alert" className="flex items-start gap-1.5 text-[13px] text-destructive-ink">
						<CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
						{errorMsg}
					</p>
				)}
				<TimeOverlapCheckError guard={overlapGuard} />
				<div className="flex flex-wrap items-center justify-between gap-3 pt-1">
					<BillableSwitch
						isBillable={isBillable}
						onChange={setIsBillable}
						label={t('dashboard.timesheets.BILLABLE')}
					/>
					<div className="ml-auto flex items-center gap-2">
						{params === 'AddTime' && (
							<Button variant="ghost" size="default" className={modalSecondaryActionClass} type="button">
								{t('common.VIEW_TIMESHEET')}
							</Button>
						)}
						<Button
							loading={isSaving}
							disabled={isSaving || durationEntry.blocksSave}
							type="submit"
							size="default"
							className={modalPrimaryActionClass}
						>
							{t('common.ADD_TIME')}
						</Button>
					</div>
				</div>
			</form>
			<TimeOverlapConfirmDialog guard={overlapGuard} confirmLabel={t('timeOverlap.CONFIRM_ADD')} />
		</Modal>
	);
}
