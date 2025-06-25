/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@/core/constants/config/constants';
import { useMemo, useCallback, useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Modal, SpinnerLoader, Text } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser, useDailyPlan, useModal, useTaskStatus, useTeamTasks, useTimerView } from '@/core/hooks';
import { toast } from 'sonner';
import { TaskNameInfoDisplay } from '../../tasks/task-displays';
import { TaskEstimate } from '../../tasks/task-estimate';
import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import clsx from 'clsx';
import { AddIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { clsxm } from '@/core/lib/utils';
import { formatIntegerToHour, formatTimeString } from '@/core/lib/helpers/index';
import { DEFAULT_PLANNED_TASK_ID } from '@/core/constants/config/constants';
import { ActiveTaskHandlerModal } from './active-task-handler-modal';
import { TaskDetailsModal } from '../../tasks/task-details-modal';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { checkPastDate } from '@/core/lib/helpers';
import moment from 'moment';
import { IconsErrorWarningFill } from '@/core/components/icons';
import { InputField } from '../../duplicated-components/_input';
import { Tooltip } from '../../duplicated-components/tooltip';
import { EverCard } from '../../common/ever-card';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { UnplanActiveTaskModal } from './unplan-active-task-modal';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * A modal that allows user to add task estimation / planned work time, etc.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {IDailyPlan} props.plan - The selected plan
 * @param {TTask[]} props.tasks - The list of planned tasks
 * @param {boolean} props.isRenderedInSoftFlow - If true use the soft flow logic.
 * @param {Date} props.selectedDate - A date on which the user can create the plan
 *
 * @returns {JSX.Element} The modal element
 */
interface IAddTasksEstimationHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan?: IDailyPlan;
	tasks: TTask[];
	isRenderedInSoftFlow?: boolean;
	selectedDate?: Date;
}

export function AddTasksEstimationHoursModal(props: IAddTasksEstimationHoursModalProps) {
	const { isOpen, closeModal, plan: propsPlan, tasks: propsTasks, isRenderedInSoftFlow = true, selectedDate } = props;
	const {
		isOpen: isActiveTaskHandlerModalOpen,
		closeModal: closeActiveTaskHandlerModal,
		openModal: openActiveTaskHandlerModal
	} = useModal();

	const t = useTranslations();
	const { updateDailyPlan, myDailyPlans, profileDailyPlans } = useDailyPlan();

	// Get the updated plan from the hook instead of relying only on props
	const plan = useMemo(() => {
		if (propsPlan?.id) {
			// Find the updated plan from the hook's state
			const updatedPlan = profileDailyPlans.items?.find((p) => p.id === propsPlan.id);
			return updatedPlan || propsPlan;
		}
		return propsPlan;
	}, [propsPlan, profileDailyPlans.items]);

	// Use the updated plan's tasks if available, otherwise fall back to props
	const tasks = useMemo(() => {
		return plan?.tasks || propsTasks;
	}, [plan?.tasks, propsTasks]);

	const { tasks: globalTasks } = useTeamTasks();
	const { startTimer, timerStatus } = useTimerView();
	const { activeTeamTask, setActiveTask } = useTeamTasks();
	const [showSearchInput, setShowSearchInput] = useState(false);
	const [workTimePlanned, setWorkTimePlanned] = useState<number>(plan?.workTimePlanned ?? 0);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	// Calculate total estimation time using global tasks to ensure updates when estimates change
	const tasksEstimationTimes = useMemo(() => {
		if (!plan?.tasks || !globalTasks) return 0;

		// Get the task IDs from the plan
		const planTaskIds = plan.tasks.map((task) => task.id);

		// Find the corresponding tasks from global state (which are always up-to-date)
		const upToDateTasks = globalTasks.filter((task) => planTaskIds.includes(task.id));

		// Calculate total estimation by summing individual task estimates from global state
		const totalEstimationSeconds = upToDateTasks.reduce((total, task) => {
			return total + (task.estimate || 0);
		}, 0);

		return totalEstimationSeconds / 3600; // Convert to hours
	}, [
		plan?.tasks?.map((task) => task.id).join(','), // Plan task IDs
		globalTasks?.map((task) => task.estimate).join(','), // Global task estimates
		plan?.tasks?.length
	]);
	const totalWorkedTime = useMemo(
		() =>
			plan && plan.tasks
				? plan.tasks.reduce((acc: number, cur) => {
						const totalWorkedTime = cur.totalWorkedTime ?? 0;

						return acc + totalWorkedTime;
					}, 0)
				: 0,
		[plan]
	);
	const [warning, setWarning] = useState('');
	const [loading, setLoading] = useState(false);
	const [defaultTask, setDefaultTask] = useState<TTask | null>(null);
	const isActiveTaskPlanned = useMemo(
		() => plan && plan.tasks && plan.tasks.some((task) => task.id == activeTeamTask?.id),
		[activeTeamTask?.id, plan]
	);
	const [isWorkingTimeInputFocused, setWorkingTimeInputFocused] = useState(false);
	const [planEditState, setPlanEditState] = useState<{ draft: boolean; saved: boolean }>({
		draft: false,
		saved: false
	});

	const canStartWorking = useMemo(() => {
		const isTodayPlan =
			plan && new Date(Date.now()).toLocaleDateString('en') == new Date(plan.date).toLocaleDateString('en');

		return isTodayPlan;
		// Can add others conditions
	}, [plan]);

	const handleCloseModal = useCallback(() => {
		if (canStartWorking) {
			localStorage.setItem(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		}
		closeModal();
	}, [canStartWorking, closeModal, currentDate]);

	/**
	 * The function that close the Planned tasks modal when the user ignores the modal (Today's plan)
	 */
	const closeModalAndSubmit = useCallback(async () => {
		try {
			setLoading(true);

			// Update the plan work time only if the user changed it
			if (plan && plan.workTimePlanned !== workTimePlanned) {
				await updateDailyPlan({ workTimePlanned }, plan.id ?? '');
				toast.success('Plan updated successfully', {
					description: `Work time planned updated to ${workTimePlanned} hours`,
					duration: 3000
				});
			}

			setPlanEditState({ draft: false, saved: true });

			handleCloseModal();
		} catch (error) {
			console.log(error);
			toast.error('Failed to update plan. Please try again.');
		} finally {
			setLoading(false);
		}
	}, [handleCloseModal, plan, updateDailyPlan, workTimePlanned, t]);

	/**
	 * The function that opens the Change task modal if conditions are met (or start the timer)
	 */
	const handleChangeActiveTask = useCallback(() => {
		if (isActiveTaskPlanned) {
			if (defaultTask?.id !== activeTeamTask?.id) {
				setActiveTask(defaultTask);
			}

			if (!isRenderedInSoftFlow) {
				handleCloseModal();
			}
			startTimer();
		} else {
			openActiveTaskHandlerModal();
		}
	}, [
		activeTeamTask?.id,
		defaultTask,
		handleCloseModal,
		isActiveTaskPlanned,
		openActiveTaskHandlerModal,
		isRenderedInSoftFlow,
		setActiveTask,
		startTimer
	]);

	/**
	 * The function which is called when the user clicks on the 'Start working' button
	 */
	const handleSubmit = useCallback(async () => {
		try {
			setLoading(true);

			// Update the plan work time only if the user changed it
			if (plan && plan.workTimePlanned !== workTimePlanned) {
				await updateDailyPlan({ workTimePlanned }, plan.id ?? '');
				toast.success('Plan updated successfully', {
					description: `Work time planned updated to ${workTimePlanned} hours`,
					duration: 3000
				});
			}

			setPlanEditState({ draft: false, saved: true });

			if (canStartWorking && !timerStatus?.running) {
				handleChangeActiveTask();
				toast.success('Work started successfully', {
					description: 'Timer has been started for your planned tasks',
					duration: 3000
				});

				if (isRenderedInSoftFlow) {
					handleCloseModal();
				}
			}
		} catch (error) {
			console.log(error);
			toast.error('Failed to start work. Please try again.');
		} finally {
			setLoading(false);
		}
	}, [
		plan,
		workTimePlanned,
		updateDailyPlan,
		canStartWorking,
		timerStatus?.running,
		handleChangeActiveTask,
		isRenderedInSoftFlow,
		handleCloseModal
	]);

	/**
	 * The function that handles warning messages for the
	 * difference of time (planned work / total estimated)
	 */
	const checkPlannedAndEstimateTimeDiff = useCallback(() => {
		if (workTimePlanned) {
			if (workTimePlanned > tasksEstimationTimes) {
				setWarning(t('dailyPlan.planned_tasks_popup.warning.PLAN_MORE_TASKS'));
			} else {
				setWarning(t('dailyPlan.planned_tasks_popup.warning.OPTIMIZE_PLAN'));
			}
		} else {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.PLANNED_TIME'));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tasksEstimationTimes, workTimePlanned]);

	// Handle warning messages (informational only, don't block Start Working)
	useEffect(() => {
		// First,  Check if there are no tasks in the plan (CRITICAL - blocks Start Working)
		if (!plan?.tasks || plan.tasks.length === 0) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.PLEASE_ADD_TASKS'));
		}
		// Next, check if no work time is planned or if planned time is invalid (CRITICAL - blocks Start Working)
		else if (!workTimePlanned || workTimePlanned <= 0) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.PLANNED_TIME'));
		}
		// Check if there are tasks without estimates (INFORMATIONAL - doesn't block)
		else if (plan.tasks.find((task) => !task.estimate)) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.TASKS_ESTIMATION'));
		}
		// If the difference between planned and estimated times is significant (INFORMATIONAL - doesn't block)
		else if (Math.abs(workTimePlanned - tasksEstimationTimes) > 1) {
			checkPlannedAndEstimateTimeDiff();
		}
		// If all checks pass, clear the warning
		else {
			setWarning('');
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workTimePlanned, tasksEstimationTimes, plan?.tasks, myDailyPlans]);

	// Put tasks without estimates at the top of the list
	const sortedTasks = useMemo(
		() =>
			[...tasks].sort((t1, t2) => {
				if (
					(t1.estimate === null || (t1.estimate && t1.estimate <= 0)) &&
					t2.estimate !== null &&
					t2.estimate &&
					t2.estimate > 0
				) {
					return -1;
				} else if (
					t1.estimate !== null &&
					t1.estimate &&
					t1.estimate > 0 &&
					(t2.estimate === null || (t2.estimate && t2.estimate <= 0))
				) {
					return 1;
				} else {
					return 0;
				}
			}),
		[tasks]
	);

	// Set the active task from the today's plan (preferable estimated task)
	useEffect(() => {
		if (!sortedTasks.find((task) => task.id == activeTeamTask?.id)) {
			[...sortedTasks].forEach((task) => {
				if (task.estimate !== null && task.estimate && task.estimate > 0) {
					if (isOpen) {
						setDefaultTask(task);
						window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, task.id!);
					}
				}
			});
		} else {
			if (isOpen && activeTeamTask) {
				setDefaultTask(activeTeamTask);
				window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, activeTeamTask.id!);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, tasks]);

	// Update the working planned time
	useEffect(() => {
		setWorkTimePlanned(plan?.workTimePlanned ?? 0);
	}, [plan?.id, plan?.workTimePlanned]);

	// Simplified logic for Start Working button
	const isStartWorkingDisabled = useMemo(() => {
		// Always disabled if loading
		if (loading) return true;

		// For today's plan (canStartWorking = true)
		if (canStartWorking) {
			// If timer is already running, only disable if no draft changes
			if (timerStatus?.running) {
				return !planEditState.draft;
			}

			// For starting work, we need at least one task and some planned time
			const hasNoTasks = !plan?.tasks || plan.tasks.length === 0;
			const hasNoPlannedTime = !workTimePlanned || workTimePlanned <= 0;

			// Only block if there are critical issues (no tasks or no planned time)
			return hasNoTasks || hasNoPlannedTime;
		}

		// For other dates, never disabled (just save)
		return false;
	}, [loading, canStartWorking, timerStatus?.running, planEditState.draft, plan?.tasks, workTimePlanned]);

	const StartWorkingButton = (
		<Button
			disabled={isStartWorkingDisabled}
			variant="default"
			type="submit"
			className={clsxm(
				'py-3 px-5 w-full  rounded-md font-light flex items-center justify-center text-md dark:text-white',
				isStartWorkingDisabled && 'bg-gray-400'
			)}
			onClick={handleSubmit}
		>
			{loading ? (
				<SpinnerLoader variant="light" size={20} />
			) : canStartWorking ? (
				timerStatus?.running && planEditState.draft ? (
					t('common.SAVE_CHANGES')
				) : (
					t('timer.todayPlanSettings.START_WORKING_BUTTON')
				)
			) : (
				t('common.plan.EDIT_PLAN')
			)}
		</Button>
	);

	// TODO: Add onclick handler
	const TimeSheetsButton = (
		<Button className="w-full px-5 py-3 font-light rounded-md text-md dark:text-white dark:bg-slate-700 dark:border-slate-600">
			{t('common.timesheets.PLURAL')}
		</Button>
	);

	const content = (
		<div className="flex flex-col justify-between w-full">
			<div className="flex flex-col w-full gap-4">
				{isRenderedInSoftFlow && (
					<Text.Heading as="h3" className="mb-3 text-center">
						{t('timer.todayPlanSettings.TITLE')}
					</Text.Heading>
				)}

				{showSearchInput ? (
					<SearchTaskInput
						defaultTask={defaultTask}
						setDefaultTask={setDefaultTask}
						setShowSearchInput={setShowSearchInput}
						selectedPlan={plan}
						selectedDate={selectedDate}
					/>
				) : plan || selectedDate ? (
					<div
						className={clsxm(
							'w-full',
							checkPastDate(plan?.date ?? selectedDate) && 'flex items-center justify-between gap-2'
						)}
					>
						<div className="flex flex-col w-full gap-2 ">
							{checkPastDate(plan?.date ?? selectedDate) ? (
								<span className="text-sm">{t('dailyPlan.PLANNED_TIME')}</span>
							) : (
								<span className="text-sm">
									{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}{' '}
									<span className="text-red-600">*</span>
								</span>
							)}
							<div className="w-full flex gap-3 h-[3rem]">
								{checkPastDate(plan?.date ?? selectedDate) ? (
									<div className="flex items-center w-full h-full gap-3 px-3 border rounded-lg">
										{formatTimeString(formatIntegerToHour(tasksEstimationTimes))}
									</div>
								) : (
									<InputField
										type="number"
										placeholder={t('timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER')}
										className="h-full"
										wrapperClassName=" h-full"
										onChange={(e) => {
											!isNaN(parseInt(e.target.value))
												? setWorkTimePlanned(parseInt(e.target.value))
												: setWorkTimePlanned(0);

											if (plan) {
												if (
													parseInt(e.target.value) !==
													parseInt(plan.workTimePlanned.toString())
												) {
													setPlanEditState({ draft: true, saved: false });
												} else {
													setPlanEditState({ draft: false, saved: false });
												}
											}
										}}
										required
										noWrapper
										min={0}
										value={
											!isNaN(workTimePlanned) && workTimePlanned.toString() !== '0'
												? workTimePlanned.toString().replace(/^0+/, '')
												: isWorkingTimeInputFocused
													? ''
													: 0
										}
										onFocus={() => setWorkingTimeInputFocused(true)}
										onBlur={() => setWorkingTimeInputFocused(false)}
										defaultValue={
											plan && plan.workTimePlanned ? parseInt(plan.workTimePlanned.toString()) : 0
										}
										readOnly={checkPastDate(plan?.date ?? selectedDate)}
									/>
								)}

								{!checkPastDate(plan?.date ?? selectedDate) && (
									<button
										onClick={() => {
											setShowSearchInput(true);
										}}
										className="flex items-center justify-center w-10 h-full border rounded-lg shrink-0"
									>
										<AddIcon className="w-4 h-4 text-dark dark:text-white" />
									</button>
								)}
							</div>
						</div>
						{checkPastDate(plan?.date ?? selectedDate) && (
							<div className="flex flex-col w-full gap-2 ">
								<span className="text-sm">{t('common.plan.TRACKED_TIME')}</span>
								<div className="w-full border rounded-lg px-3 items-center flex gap-3 h-[3rem]">
									{formatTimeString(formatIntegerToHour(totalWorkedTime ?? 0))}
								</div>
							</div>
						)}
					</div>
				) : null}

				{plan ? (
					<>
						<div className="flex flex-col gap-3 text-sm">
							<div className="flex flex-col gap-3 text-sm">
								<div className="flex flex-col gap-2 text-sm">
									<div className="flex items-center justify-between w-full gap-2">
										<div className="flex items-center justify-center gap-1">
											<span>{t('task.TITLE_PLURAL')}</span>
											{!checkPastDate(plan.date) && <span className="text-red-600">*</span>}
										</div>
										<div className="flex items-center justify-center gap-1">
											{checkPastDate(plan.date) ? (
												<>
													<span>{t('dailyPlan.ESTIMATED')} :</span>
													<span className="font-medium ">
														{formatTimeString(formatIntegerToHour(tasksEstimationTimes))}
													</span>
												</>
											) : tasksEstimationTimes ? (
												<>
													<span>{t('dailyPlan.TOTAL_ESTIMATED')} :</span>
													<span className="font-medium ">
														{formatTimeString(formatIntegerToHour(tasksEstimationTimes))}
													</span>
												</>
											) : null}
										</div>
									</div>
									<div className="w-full h-full">
										<ul className="flex flex-col gap-2 overflow-y-auto h-80 ">
											{sortedTasks.map((task, index) => (
												<TaskCard
													plan={plan}
													key={index}
													task={task}
													setDefaultTask={setDefaultTask}
													isDefaultTask={task.id == defaultTask?.id}
												/>
											))}
										</ul>
									</div>
								</div>
								<div className="flex items-center h-6 gap-2 text-sm text-red-500">
									{!checkPastDate(plan.date) && warning && (
										<>
											<IconsErrorWarningFill className="text-[14px]" />
											<span className="text-xs ">{warning}</span>
										</>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between ">
							<Button
								disabled={loading}
								variant="outline"
								type="submit"
								className="w-40 px-5 py-3 font-light rounded-md text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
								onClick={isRenderedInSoftFlow ? closeModalAndSubmit : handleCloseModal}
							>
								{isRenderedInSoftFlow ? t('common.SKIP_ADD_LATER') : t('common.CANCEL')}
							</Button>
							{canStartWorking && timerStatus?.running && !planEditState.draft ? (
								<Tooltip className="min-w-[10rem]" label={t('timer.todayPlanSettings.TIMER_RUNNING')}>
									{StartWorkingButton}
								</Tooltip>
							) : (
								<div className="w-40 h-full border">
									{checkPastDate(plan.date) ? TimeSheetsButton : StartWorkingButton}
								</div>
							)}
						</div>
					</>
				) : null}
			</div>
		</div>
	);

	return (
		<>
			{isRenderedInSoftFlow ? (
				<Modal isOpen={isOpen} closeModal={closeModalAndSubmit} showCloseIcon>
					<EverCard className="w-[36rem]" shadow="custom">
						{content}
					</EverCard>
				</Modal>
			) : (
				content
			)}

			{defaultTask && (
				<ActiveTaskHandlerModal
					defaultPlannedTask={defaultTask}
					open={isActiveTaskHandlerModalOpen}
					closeModal={() => {
						if (!isRenderedInSoftFlow) {
							handleCloseModal();
						}
						closeActiveTaskHandlerModal();
					}}
				/>
			)}
		</>
	);
}

/**
 * ----------------------------------------------------------------
 * 		--------- Search / Add / Create task input -----------
 * ----------------------------------------------------------------
 */

interface ISearchTaskInputProps {
	selectedPlan?: IDailyPlan;
	setShowSearchInput: Dispatch<SetStateAction<boolean>>;
	setDefaultTask: Dispatch<SetStateAction<TTask | null>>;
	defaultTask: TTask | null;
	selectedDate?: Date;
}

/**
 * Search task input
 *
 * @param {Object} props - The props object
 * @param {string} props.selectedPlan - The selected plan
 * @param {Dispatch<SetStateAction<boolean>>} props.setShowSearchInput - A setter for (showing / hiding) the input
 * @param {Dispatch<SetStateAction<TTask>>} props.setDefaultTask - A function that sets default planned task
 * @param {TTask} props.defaultTask - The default planned task
 * @param {Date} props.selectedDate - A date on which the user can create the plan
 *
 * @returns The Search input component
 */
export function SearchTaskInput(props: ISearchTaskInputProps) {
	const { selectedPlan, setShowSearchInput, defaultTask, setDefaultTask, selectedDate } = props;
	const { tasks: teamTasks, createTask } = useTeamTasks();
	const { taskStatuses } = useTaskStatus();
	const [taskName, setTaskName] = useState('');
	const [tasks, setTasks] = useState<TTask[]>([]);
	const [createTaskLoading, setCreateTaskLoading] = useState(false);
	const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
	const t = useTranslations();

	// The ref for the popover button (rendered as an input)
	const searchInputRef = useRef<HTMLButtonElement>(null);

	const isTaskPlanned = useCallback(
		(taskId: string) => {
			return selectedPlan && selectedPlan?.tasks?.some((task) => task.id == taskId);
		},
		[selectedPlan]
	);

	useEffect(() => {
		setTasks(
			teamTasks
				.filter((task) => task.title.toLowerCase().includes(taskName.toLowerCase()))
				// Put the unplanned tasks at the top of the list.
				.sort((task1, task2) => {
					if (isTaskPlanned(task1.id) && !isTaskPlanned(task2.id)) {
						return 1;
					} else if (!isTaskPlanned(task1.id) && isTaskPlanned(task2.id)) {
						return -1;
					} else {
						return 0;
					}
				})
		);
	}, [isTaskPlanned, selectedPlan?.tasks, taskName, teamTasks]);

	const handleCreateTask = useCallback(async () => {
		try {
			setCreateTaskLoading(true);
			if (taskName.trim().length < 5) return;
			await createTask({
				title: taskName.trim(),
				status: taskStatuses[0].name,
				taskStatusId: taskStatuses[0].id,
				issueType: 'Bug' // TODO: Let the user choose the issue type
			});
			toast.success('Task created successfully', {
				description: `Task "${taskName.trim()}" has been created`,
				duration: 3000
			});
		} catch (error) {
			console.log(error);
			toast.error('Failed to create task. Please try again.');
		} finally {
			setCreateTaskLoading(false);
		}
	}, [createTask, taskName, taskStatuses]);

	/**
	 * Focus on the search input when the popover is mounted.
	 */
	useEffect(() => {
		searchInputRef.current?.focus();
	}, []);

	return (
		<Popover className={clsxm('relative z-20 w-full')}>
			<div className="flex flex-col items-start w-full gap-2">
				<span className="text-sm">Select or create task for the plan</span>
				<div className="w-full flex gap-3 h-[3rem]">
					<PopoverButton
						placeholder={'Select or create task for the plan'}
						className={clsxm(
							'bg-light--theme-light dark:bg-dark--theme-light dark:text-white',
							'input-border',
							'py-2 px-4 rounded-[10px]',
							'text-sm outline-none ',
							'h-12 w-full',
							'h-full z-50 w-full px-3 focus:outline-none'
						)}
						required
						as="input"
						ref={searchInputRef}
						onChange={(e) => setTaskName(e.target.value)}
						onFocus={() => setIsSearchInputFocused(true)}
						value={taskName}
					/>
					<button
						onClick={() => {
							setShowSearchInput(false);
						}}
						className="flex items-center justify-center w-10 h-full border rounded-lg shrink-0"
					>
						<Tooltip label={t('common.CLOSE')}>
							<Cross2Icon className="text-xl cursor-pointer" />
						</Tooltip>
					</button>
				</div>
			</div>

			<PopoverPanel static={isSearchInputFocused} className={clsxm('absolute mt-1  w-full')}>
				{tasks.length ? (
					<EverCard shadow="custom" className="border shadow-lg !p-3">
						<ul className="flex h-[25rem] overflow-y-auto flex-col w-full gap-2">
							{tasks.map((task, index) => (
								<li key={index}>
									<TaskCard
										viewListMode={isTaskPlanned(task.id) ? 'planned' : 'searched'}
										task={task}
										plan={selectedPlan}
										setDefaultTask={setDefaultTask}
										isDefaultTask={task.id == defaultTask?.id}
										selectedDate={selectedDate}
										onTaskAdded={() => setShowSearchInput(false)}
									/>
								</li>
							))}
						</ul>
					</EverCard>
				) : (
					<EverCard shadow="custom" className="shadow-lg border z-40 !rounded !p-2">
						<Button
							disabled={createTaskLoading || taskName.trim().length < 5}
							onClick={handleCreateTask}
							className="w-full h-full min-h-12"
						>
							{createTaskLoading ? <SpinnerLoader variant="light" size={20} /> : 'Create Task'}
						</Button>
					</EverCard>
				)}
			</PopoverPanel>
		</Popover>
	);
}

/**
 * ----------------------------------------------------------------
 * 		-------------------- TASK CARD -----------------------
 * ----------------------------------------------------------------
 */

interface ITaskCardProps {
	task: TTask;
	setDefaultTask: Dispatch<SetStateAction<TTask | null>>;
	isDefaultTask: boolean;
	plan?: IDailyPlan;
	viewListMode?: 'planned' | 'searched';
	selectedDate?: Date;
	onTaskAdded?: () => void; // Callback to close search input after adding task
}

function TaskCard(props: ITaskCardProps) {
	const { task, plan, viewListMode = 'planned', isDefaultTask, setDefaultTask, selectedDate, onTaskAdded } = props;
	const { getTaskById } = useTeamTasks();
	const { addTaskToPlan, createDailyPlan } = useDailyPlan();
	const { user } = useAuthenticateUser();
	const [addToPlanLoading, setAddToPlanLoading] = useState(false);
	const isTaskRenderedInTodayPlan =
		plan && new Date(Date.now()).toLocaleDateString('en') == new Date(plan.date).toLocaleDateString('en');
	const {
		isOpen: isTaskDetailsModalOpen,
		closeModal: closeTaskDetailsModal,
		openModal: openTaskDetailsModal
	} = useModal();
	const {
		isOpen: isUnplanActiveTaskModalOpen,
		closeModal: closeUnplanActiveTaskModal,
		openModal: openUnplanActiveTaskModal
	} = useModal();

	const handleOpenTaskDetailsModal = useCallback(() => {
		// Update the detailed task state
		getTaskById(task.id!);
		openTaskDetailsModal();
	}, [getTaskById, openTaskDetailsModal, task.id]);

	const t = useTranslations();
	const status = useTaskStatus();
	const { activeTeamTask } = useTeamTasks();

	/**
	 * The function that adds the task to the selected plan
	 */
	const handleAddTask = useCallback(async () => {
		try {
			setAddToPlanLoading(true);

			if (plan && plan.id) {
				await addTaskToPlan({ taskId: task.id }, plan.id);
				toast.success('Task added to plan', {
					description: `"${task.title}" has been added to your daily plan`,
					duration: 3000
				});
				// Close search input after successful addition
				onTaskAdded?.();
			} else {
				const planDate = plan ? plan.date : selectedDate;

				if (planDate) {
					await createDailyPlan({
						workTimePlanned: 0,
						taskId: task.id,
						date: new Date(moment(planDate).format('YYYY-MM-DD')),
						status: EDailyPlanStatus.OPEN,
						tenantId: user?.tenantId ?? '',
						employeeId: user?.employee?.id,
						organizationId: user?.employee?.organizationId!
					});
					toast.success('Daily plan created', {
						description: `Daily plan created with task "${task.title}"`,
						duration: 3000
					});
					// Close search input after successful addition
					onTaskAdded?.();
				}
			}
		} catch (error) {
			console.log(error);
			toast.error('Failed to add task to plan. Please try again.');
		} finally {
			setAddToPlanLoading(false);
		}
	}, [
		addTaskToPlan,
		createDailyPlan,
		plan,
		selectedDate,
		task.id,
		task.title,
		user?.employee?.id,
		user?.employee?.organizationId,
		user?.tenantId,
		onTaskAdded
	]);

	return (
		<EverCard
			shadow="custom"
			className={clsx(
				'lg:flex  items-center gap-2 justify-between py-3  md:px-4 hidden min-h-[4.5rem] w-full h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				isTaskRenderedInTodayPlan && isDefaultTask && 'border-primary-light border-[0.15rem]'
			)}
		>
			<div
				onClick={() => {
					if (isTaskRenderedInTodayPlan) {
						setDefaultTask(task);
						window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, task.id!);
					}
				}}
				className="min-w-52 flex items-center h-full max-w-[50%] truncate"
			>
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<div className="flex items-center justify-end h-full gap-2 grow">
				{viewListMode === 'searched' ? (
					<Button onClick={handleAddTask} variant="outline" className=" mon-h-12" type="button">
						{addToPlanLoading ? <SpinnerLoader variant="dark" size={20} /> : 'Add'}
					</Button>
				) : plan ? (
					<>
						<div className="flex items-center h-full gap-1 min-w-fit">
							{checkPastDate(plan.date) ? (
								<span
									className="flex items-center justify-center h-6 truncate min-w-fit max-w-28"
									style={{
										backgroundColor:
											status.taskStatuses.filter((s) => s.value === task.status)[0].color ??
											undefined
									}}
								>
									{task.status}
								</span>
							) : (
								<span className="text-nowrap whitespace-nowrap">{t('dailyPlan.ESTIMATED')} :</span>
							)}

							<TaskEstimate showEditAndSaveButton={!checkPastDate(plan.date)} _task={task} />
						</div>
						<span className="flex items-center justify-center w-4 h-full">
							<TaskCardActions
								openTaskDetailsModal={handleOpenTaskDetailsModal}
								openUnplanActiveTaskModal={openUnplanActiveTaskModal}
								selectedPlan={plan}
								task={task}
							/>
						</span>
					</>
				) : null}
			</div>
			<TaskDetailsModal task={task} isOpen={isTaskDetailsModalOpen} closeModal={closeTaskDetailsModal} />
			{plan && activeTeamTask && (
				<UnplanActiveTaskModal
					open={isUnplanActiveTaskModalOpen}
					task={activeTeamTask}
					plan={plan}
					closeModal={closeUnplanActiveTaskModal}
				/>
			)}
		</EverCard>
	);
}

/**
 * ----------------------------------------------------------------
 * 		----------------- TASK CARD ACTIONS -------------------
 * ----------------------------------------------------------------
 */

interface ITaskCardActionsProps {
	task: TTask;
	selectedPlan: IDailyPlan;
	openTaskDetailsModal: () => void;
	openUnplanActiveTaskModal: () => void;
}

/**
 * A Popover that contains task actions (view, edit, unplan)
 *
 * @param {object} props - The props object
 * @param {TTask} props.task - The task on which actions will be performed
 * @param {IDailyPlan} props.selectedPlan - The currently selected plan
 * @param {() => void} props.openTaskDetailsModal - A function that opens a task details modal
 * @param {() => void} props.openUnplanActiveTaskModal - A function to open the unplanActiveTask modal
 *
 * @returns {JSX.Element} The Popover component.
 */

function TaskCardActions(props: ITaskCardActionsProps) {
	const { task, selectedPlan, openTaskDetailsModal, openUnplanActiveTaskModal } = props;
	const { user } = useAuthenticateUser();
	const { futurePlans, todayPlan, removeTaskFromPlan, removeTaskFromPlanLoading } = useDailyPlan();
	const { activeTeamTask } = useTeamTasks();
	const { timerStatus } = useTimerView();
	const otherPlanIds = useMemo(
		() =>
			[...futurePlans, ...todayPlan]
				// Remove selected plan
				.filter((plan) => plan.id! !== selectedPlan.id)
				.filter((plan) => plan.tasks && plan.tasks.find((_task: TTask) => _task.id == task.id))
				.map((plan) => plan.id!),
		[futurePlans, selectedPlan.id, task.id, todayPlan]
	);
	const isTodayPLan = useMemo(
		() =>
			new Date(selectedPlan?.date).toLocaleDateString('en') ==
			new Date(todayPlan[0]?.date).toLocaleDateString('en'),
		[selectedPlan.date, todayPlan]
	);

	/**
	 * Unplan selected task
	 */
	const unplanSelectedDate = useCallback(
		async (closePopover: () => void) => {
			try {
				if (task.id == activeTeamTask?.id) {
					if (timerStatus?.running && isTodayPLan) {
						openUnplanActiveTaskModal();
					} else {
						if (selectedPlan?.id) {
							await removeTaskFromPlan(
								{ taskId: task.id, employeeId: user?.employee?.id },
								selectedPlan?.id
							);
							toast.success('Task removed from plan', {
								description: `"${task.title}" has been removed from your daily plan`,
								duration: 3000
							});
						}
					}
				} else {
					if (selectedPlan?.id) {
						await removeTaskFromPlan({ taskId: task.id, employeeId: user?.employee?.id }, selectedPlan?.id);
						toast.success('Task removed from plan', {
							description: `"${task.title}" has been removed from your daily plan`,
							duration: 3000
						});
					}
				}

				closePopover();
			} catch (error) {
				console.log(error);
				toast.error('Failed to remove task from plan. Please try again.');
			}
		},
		[
			activeTeamTask?.id,
			isTodayPLan,
			openUnplanActiveTaskModal,
			removeTaskFromPlan,
			selectedPlan.id,
			task.id,
			task.title,
			timerStatus?.running,
			user?.employee?.id
		]
	);

	return (
		<Popover>
			<PopoverButton className="flex items-center justify-center w-4 h-full border-none outline-none">
				<ThreeCircleOutlineVerticalIcon className="  dark:text-[#B1AEBC]" />
			</PopoverButton>

			<Transition
				as="div"
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-0 min-w-[110px]"
			>
				<PopoverPanel className="z-50">
					{({ close }) => {
						return (
							<EverCard shadow="custom" className="shadow-xl card  !p-3 !rounded-lg !border-2">
								<ul className="flex flex-col justify-end gap-3 ">
									<li
										onClick={openTaskDetailsModal}
										className={clsxm('hover:font-semibold hover:transition-all')}
									>
										View
									</li>
									{checkPastDate(selectedPlan.date) ? null : (
										<>
											<li className={clsxm('hover:font-semibold hover:transition-all')}>Edit</li>

											{selectedPlan.id && (
												<li>
													{otherPlanIds.length ? (
														<UnplanTask
															taskId={task.id}
															selectedPlanId={selectedPlan.id}
															planIds={[selectedPlan.id, ...otherPlanIds]}
															closeActionPopover={close}
															openUnplanActiveTaskModal={openUnplanActiveTaskModal}
															unplanSelectedDate={unplanSelectedDate}
															unPlanSelectedDateLoading={removeTaskFromPlanLoading}
														/>
													) : (
														<span
															onClick={() => unplanSelectedDate(close)}
															className={clsxm(
																' text-red-600',
																!removeTaskFromPlanLoading &&
																	' hover:font-semibold hover:transition-all'
															)}
														>
															{removeTaskFromPlanLoading ? (
																<SpinnerLoader size={10} />
															) : (
																'Unplan'
															)}
														</span>
													)}
												</li>
											)}
										</>
									)}
								</ul>
							</EverCard>
						);
					}}
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}

/**
 * ----------------------------------------------------------------
 * 		---------------- UNPLAN TASK ACTIONS ----------------
 * ----------------------------------------------------------------
 */

interface IUnplanTaskProps {
	taskId: ID;
	selectedPlanId: string;
	planIds: string[];
	closeActionPopover: () => void;
	unplanSelectedDate: (closePopover: () => void) => Promise<void>;
	unPlanSelectedDateLoading: boolean;
	openUnplanActiveTaskModal: () => void;
}

/**
 * A Popover that contains unplan options (unplan selected date, unplan all dates)
 *
 * @param {object} props - The props object
 * @param {string} props.taskId - The task id
 * @param {string} props.selectedPlanId - The currently selected plan id
 * @param {string[]} [props.planIds] - Others plans's ids
 * @param {() => void} props.closeActionPopover - The function to close the task card actions popover
 * @param {(taskIds: string[]) => void} props.wantsToUnplanActiveTask - Will be called when the user wants to unplan the activeTas
 * @param {() => void} props.openUnplanActiveTaskModal - A function to open the unplanActiveTask modal
 *
 *
 *
 * @returns {JSX.Element} The Popover component.
 */

function UnplanTask(props: IUnplanTaskProps) {
	const {
		taskId,
		planIds,
		closeActionPopover,
		unplanSelectedDate,
		openUnplanActiveTaskModal,
		unPlanSelectedDateLoading
	} = props;
	const { user } = useAuthenticateUser();
	const { removeManyTaskPlans, removeManyTaskFromPlanLoading, todayPlan } = useDailyPlan();
	const { activeTeamTask } = useTeamTasks();
	const { timerStatus } = useTimerView();
	const isActiveTaskPlannedToday = useMemo(
		() => todayPlan[0].tasks?.find((task) => task.id === activeTeamTask?.id),
		[activeTeamTask?.id, todayPlan]
	);

	/**
	 * Unplan all tasks
	 */
	const unplanAll = useCallback(
		async (closePopover: () => void) => {
			try {
				// First, check if the user wants to unplan the active task
				if (taskId == activeTeamTask?.id) {
					if (timerStatus?.running && isActiveTaskPlannedToday) {
						openUnplanActiveTaskModal();
						// TODO: Unplan from all plans after clicks 'YES'
					} else {
						await removeManyTaskPlans({ plansIds: planIds, employeeId: user?.employee?.id }, taskId!);
						toast.success('Task removed from all plans', {
							description: 'Task has been removed from all daily plans',
							duration: 3000
						});
					}
				} else {
					await removeManyTaskPlans({ plansIds: planIds, employeeId: user?.employee?.id }, taskId);
					toast.success('Task removed from all plans', {
						description: 'Task has been removed from all daily plans',
						duration: 3000
					});
				}

				closePopover();
				// Close the task card actions popover as well
				closeActionPopover();
			} catch (error) {
				console.log(error);
				toast.error('Failed to remove task from plans. Please try again.');
			}
		},
		[
			activeTeamTask?.id,
			closeActionPopover,
			isActiveTaskPlannedToday,
			openUnplanActiveTaskModal,
			planIds,
			removeManyTaskPlans,
			taskId,
			timerStatus?.running,
			user?.employee?.id
		]
	);

	return (
		<Popover>
			<PopoverButton>
				<span className={clsxm(' text-red-600 hover:font-semibold hover:transition-all')}>Unplan</span>
			</PopoverButton>

			<Transition
				as="div"
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-0 min-w-[110px]"
			>
				<PopoverPanel className="z-50">
					{({ close }) => {
						return (
							<EverCard
								shadow="custom"
								className=" shadow-xl card  min-w-max w-[11rem] flex flex-col justify-end !p-0 !rounded-lg !border-2"
							>
								<ul className="flex flex-col justify-end w-full gap-3 p-3 border">
									<li
										onClick={() => unplanSelectedDate(close)}
										className={clsxm(
											'shrink-0',
											!unPlanSelectedDateLoading && 'hover:font-semibold hover:transition-all '
										)}
									>
										{unPlanSelectedDateLoading ? (
											<SpinnerLoader size={10} />
										) : (
											'Unplan selected date'
										)}
									</li>
									<li
										onClick={() => unplanAll(close)}
										className={clsxm(
											'shrink-0',
											!removeManyTaskFromPlanLoading &&
												'hover:font-semibold hover:transition-all '
										)}
									>
										{removeManyTaskFromPlanLoading ? <SpinnerLoader size={10} /> : 'Unplan all'}
									</li>
								</ul>
								<button
									onClick={() => {
										close();
									}}
									className={clsxm('w-full bg-primary/5 px-3 py-2')}
								>
									<span>Cancel</span>
								</button>
							</EverCard>
						);
					}}
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}
