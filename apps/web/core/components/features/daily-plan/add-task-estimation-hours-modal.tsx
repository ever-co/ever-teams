/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@app/constants';
import { useMemo, useCallback, useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Card, InputField, Modal, SpinnerLoader, Text, Tooltip, VerticalSeparator } from '@/core/components';
import { Button } from '@/core/components/ui/button';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser, useDailyPlan, useModal, useTaskStatus, useTeamTasks, useTimerView } from '@/core/hooks';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { TaskEstimate } from '../task/task-estimate';
import { DailyPlanStatusEnum, IDailyPlan, ITeamTask } from '@/core/types/interfaces';
import clsx from 'clsx';
import { AddIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { estimatedTotalTime } from '../task/daily-plan';
import { clsxm } from '@app/utils';
import { formatIntegerToHour, formatTimeString } from '@app/helpers';
import { DEFAULT_PLANNED_TASK_ID } from '@app/constants';
import { ActiveTaskHandlerModal } from './active-task-handler-modal';
import { TaskDetailsModal } from './task-details-modal';
import { Popover, Transition } from '@headlessui/react';
import { ScrollArea, ScrollBar } from '@/core/components/ui/scroll-bar';
import { Cross2Icon } from '@radix-ui/react-icons';
import { checkPastDate } from '@/core/lib/helpers';
import { UnplanActiveTaskModal } from './unplan-active-task-modal';
import moment from 'moment';
import { IconsErrorWarningFill } from '@/icons';

/**
 * A modal that allows user to add task estimation / planned work time, etc.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {IDailyPlan} props.plan - The selected plan
 * @param {ITeamTask[]} props.tasks - The list of planned tasks
 * @param {boolean} props.isRenderedInSoftFlow - If true use the soft flow logic.
 * @param {Date} props.selectedDate - A date on which the user can create the plan
 *
 * @returns {JSX.Element} The modal element
 */
interface IAddTasksEstimationHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan?: IDailyPlan;
	tasks: ITeamTask[];
	isRenderedInSoftFlow?: boolean;
	selectedDate?: Date;
}

export function AddTasksEstimationHoursModal(props: IAddTasksEstimationHoursModalProps) {
	const { isOpen, closeModal, plan, tasks, isRenderedInSoftFlow = true, selectedDate } = props;
	const {
		isOpen: isActiveTaskHandlerModalOpen,
		closeModal: closeActiveTaskHandlerModal,
		openModal: openActiveTaskHandlerModal
	} = useModal();

	const t = useTranslations();
	const { updateDailyPlan, myDailyPlans } = useDailyPlan();
	const { startTimer, timerStatus } = useTimerView();
	const { activeTeamTask, setActiveTask } = useTeamTasks();
	const [showSearchInput, setShowSearchInput] = useState(false);
	const [workTimePlanned, setWorkTimePlanned] = useState<number>(plan?.workTimePlanned ?? 0);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const tasksEstimationTimes = useMemo(
		() => (plan && plan.tasks ? estimatedTotalTime(plan.tasks).timesEstimated / 3600 : 0),
		[plan]
	);
	const totalWorkedTime = useMemo(
		() =>
			plan && plan.tasks
				? plan.tasks.reduce((acc, cur) => {
						const totalWorkedTime = cur.totalWorkedTime ?? 0;

						return acc + totalWorkedTime;
					}, 0)
				: 0,
		[plan]
	);
	const [warning, setWarning] = useState('');
	const [loading, setLoading] = useState(false);
	const [defaultTask, setDefaultTask] = useState<ITeamTask | null>(null);
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
			plan &&
				plan.workTimePlanned !== workTimePlanned &&
				(await updateDailyPlan({ workTimePlanned }, plan.id ?? ''));

			setPlanEditState({ draft: false, saved: true });

			handleCloseModal();
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}, [handleCloseModal, plan, updateDailyPlan, workTimePlanned]);

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
			plan &&
				plan.workTimePlanned !== workTimePlanned &&
				(await updateDailyPlan({ workTimePlanned }, plan.id ?? ''));

			setPlanEditState({ draft: false, saved: true });

			if (canStartWorking && !timerStatus?.running) {
				handleChangeActiveTask();

				if (isRenderedInSoftFlow) {
					handleCloseModal();
				}
			}
		} catch (error) {
			console.log(error);
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

	// Handle warning messages
	useEffect(() => {
		// First,  Check if there are no tasks in the plan
		if (!plan?.tasks || plan.tasks.length === 0) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.PLEASE_ADD_TASKS')); // New warning for no tasks
		} else {
			//Check if there are tasks without estimates and show the corresponding warning
			if (plan.tasks.find((task) => !task.estimate)) {
				setWarning(t('dailyPlan.planned_tasks_popup.warning.TASKS_ESTIMATION'));
			}
			// Next, check if no work time is planned or if planned time is invalid
			else if (!workTimePlanned || workTimePlanned <= 0) {
				setWarning(t('dailyPlan.planned_tasks_popup.warning.PLANNED_TIME'));
			}
			// If the difference between planned and estimated times is significant, check further
			else if (Math.abs(workTimePlanned - tasksEstimationTimes) > 1) {
				checkPlannedAndEstimateTimeDiff();
			}
			// If all checks pass, clear the warning
			else {
				setWarning('');
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workTimePlanned, tasksEstimationTimes, plan?.tasks, myDailyPlans]);

	// Put tasks without estimates at the top of the list
	const sortedTasks = useMemo(
		() =>
			[...tasks].sort((t1, t2) => {
				if ((t1.estimate === null || t1.estimate <= 0) && t2.estimate !== null && t2.estimate > 0) {
					return -1;
				} else if (t1.estimate !== null && t1.estimate > 0 && (t2.estimate === null || t2.estimate <= 0)) {
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
				if (task.estimate !== null && task.estimate > 0) {
					if (isOpen) {
						setDefaultTask(task);
						window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, task.id);
					}
				}
			});
		} else {
			if (isOpen && activeTeamTask) {
				setDefaultTask(activeTeamTask);
				window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, activeTeamTask.id);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, tasks]);

	// Update the working planned time
	useEffect(() => {
		setWorkTimePlanned(plan?.workTimePlanned ?? 0);
	}, [plan?.id, plan?.workTimePlanned]);

	const StartWorkingButton = (
		<Button
			disabled={
				(canStartWorking && warning) || loading || (canStartWorking && timerStatus?.running)
					? planEditState.draft && !warning
						? false
						: true
					: false
			}
			variant="default"
			type="submit"
			className={clsxm(
				'py-3 px-5 w-full  rounded-md font-light flex items-center justify-center text-md dark:text-white',
				canStartWorking && warning && 'bg-gray-400'
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
		<Button className="py-3 px-5 w-full rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600">
			{t('common.timesheets.PLURAL')}
		</Button>
	);

	const content = (
		<div className="flex w-full flex-col justify-between">
			<div className="w-full flex flex-col gap-4">
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
						<div className=" w-full flex flex-col gap-2">
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
									<div className="w-full border rounded-lg px-3 items-center flex gap-3 h-full">
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
										className="h-full shrink-0 rounded-lg border w-10 flex items-center justify-center"
									>
										<AddIcon className="w-4 h-4 text-dark dark:text-white" />
									</button>
								)}
							</div>
						</div>
						{checkPastDate(plan?.date ?? selectedDate) && (
							<div className=" w-full flex flex-col gap-2">
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
						<div className="text-sm flex flex-col gap-3">
							<div className="text-sm flex flex-col gap-3">
								<div className="text-sm flex flex-col gap-2">
									<div className="w-full flex items-center justify-between gap-2">
										<div className="flex items-center justify-center gap-1">
											<span>{t('task.TITLE_PLURAL')}</span>
											{!checkPastDate(plan.date) && <span className="text-red-600">*</span>}
										</div>
										<div className="flex items-center justify-center gap-1">
											{checkPastDate(plan.date) ? (
												<>
													<span>{t('dailyPlan.ESTIMATED')} :</span>
													<span className=" font-medium">
														{formatTimeString(formatIntegerToHour(tasksEstimationTimes))}
													</span>
												</>
											) : tasksEstimationTimes ? (
												<>
													<span>{t('dailyPlan.TOTAL_ESTIMATED')} :</span>
													<span className=" font-medium">
														{formatTimeString(formatIntegerToHour(tasksEstimationTimes))}
													</span>
												</>
											) : null}
										</div>
									</div>
									<div className="h-80">
										<ScrollArea className="w-full h-full">
											<ul className=" flex flex-col gap-2">
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
											<ScrollBar className="-pr-20" />
										</ScrollArea>
									</div>
								</div>
								<div className="flex gap-2 items-center text-sm h-6 text-red-500">
									{!checkPastDate(plan.date) && warning && (
										<>
											<IconsErrorWarningFill className="text-[14px]" />
											<span className=" text-xs">{warning}</span>
										</>
									)}
								</div>
							</div>
						</div>
						<div className=" flex justify-between items-center">
							<Button
								disabled={loading}
								variant="outline"
								type="submit"
								className="py-3 px-5 w-40 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
								onClick={isRenderedInSoftFlow ? closeModalAndSubmit : handleCloseModal}
							>
								{isRenderedInSoftFlow ? t('common.SKIP_ADD_LATER') : t('common.CANCEL')}
							</Button>
							{canStartWorking && timerStatus?.running && !planEditState.draft ? (
								<Tooltip className="min-w-[10rem]" label={t('timer.todayPlanSettings.TIMER_RUNNING')}>
									{StartWorkingButton}
								</Tooltip>
							) : (
								<div className="w-40 border h-full">
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
					<Card className="w-[36rem]" shadow="custom">
						{content}
					</Card>
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
	setDefaultTask: Dispatch<SetStateAction<ITeamTask | null>>;
	defaultTask: ITeamTask | null;
	selectedDate?: Date;
}

/**
 * Search task input
 *
 * @param {Object} props - The props object
 * @param {string} props.selectedPlan - The selected plan
 * @param {Dispatch<SetStateAction<boolean>>} props.setShowSearchInput - A setter for (showing / hiding) the input
 * @param {Dispatch<SetStateAction<ITeamTask>>} props.setDefaultTask - A function that sets default planned task
 * @param {ITeamTask} props.defaultTask - The default planned task
 * @param {Date} props.selectedDate - A date on which the user can create the plan
 *
 * @returns The Search input component
 */
export function SearchTaskInput(props: ISearchTaskInputProps) {
	const { selectedPlan, setShowSearchInput, defaultTask, setDefaultTask, selectedDate } = props;
	const { tasks: teamTasks, createTask } = useTeamTasks();
	const { taskStatuses } = useTaskStatus();
	const [taskName, setTaskName] = useState('');
	const [tasks, setTasks] = useState<ITeamTask[]>([]);
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
		} catch (error) {
			console.log(error);
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
			<div className="w-full flex flex-col gap-2 items-start">
				<span className="text-sm">Select or create task for the plan</span>
				<div className="w-full flex gap-3 h-[3rem]">
					<Popover.Button
						placeholder={'Select or create task for the plan'}
						className={clsxm(
							'bg-light--theme-light dark:bg-dark--theme-light dark:text-white',
							'input-border',
							'py-2 px-4 rounded-[10px]',
							'text-sm outline-none ',
							'h-[50px] w-full',
							'font-light tracking-tight',
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
						className="h-full shrink-0 rounded-lg border w-10 flex items-center justify-center"
					>
						<Tooltip label={t('common.CLOSE')}>
							<Cross2Icon className="text-xl cursor-pointer" />
						</Tooltip>
					</button>
				</div>
			</div>

			<Popover.Panel static={isSearchInputFocused} className={clsxm('absolute mt-1  w-full')}>
				{tasks.length ? (
					<Card shadow="custom" className="h-[25rem] border shadow-lg !p-3">
						<ScrollArea className="w-full h-full">
							<ul className="w-full h-full flex flex-col gap-2">
								{tasks.map((task, index) => (
									<li key={index}>
										<TaskCard
											viewListMode={isTaskPlanned(task.id) ? 'planned' : 'searched'}
											task={task}
											plan={selectedPlan}
											setDefaultTask={setDefaultTask}
											isDefaultTask={task.id == defaultTask?.id}
											selectedDate={selectedDate}
										/>
									</li>
								))}
							</ul>
							<ScrollBar className="-pr-20" />
						</ScrollArea>
					</Card>
				) : (
					<Card shadow="custom" className="shadow-lg border z-40 !rounded !p-2">
						<Button
							disabled={createTaskLoading || taskName.trim().length < 5}
							onClick={handleCreateTask}
							className="w-full h-full min-h-12"
						>
							{createTaskLoading ? <SpinnerLoader variant="light" size={20} /> : 'Create Task'}
						</Button>
					</Card>
				)}
			</Popover.Panel>
		</Popover>
	);
}

/**
 * ----------------------------------------------------------------
 * 		-------------------- TASK CARD -----------------------
 * ----------------------------------------------------------------
 */

interface ITaskCardProps {
	task: ITeamTask;
	setDefaultTask: Dispatch<SetStateAction<ITeamTask | null>>;
	isDefaultTask: boolean;
	plan?: IDailyPlan;
	viewListMode?: 'planned' | 'searched';
	selectedDate?: Date;
}

function TaskCard(props: ITaskCardProps) {
	const { task, plan, viewListMode = 'planned', isDefaultTask, setDefaultTask, selectedDate } = props;
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
		getTaskById(task.id);
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
			} else {
				const planDate = plan ? plan.date : selectedDate;

				if (planDate) {
					await createDailyPlan({
						workTimePlanned: 0,
						taskId: task.id,
						date: new Date(moment(planDate).format('YYYY-MM-DD')),
						status: DailyPlanStatusEnum.OPEN,
						tenantId: user?.tenantId ?? '',
						employeeId: user?.employee.id,
						organizationId: user?.employee.organizationId
					});
				}
			}
		} catch (error) {
			console.log(error);
		} finally {
			setAddToPlanLoading(false);
		}
	}, [
		addTaskToPlan,
		createDailyPlan,
		plan,
		selectedDate,
		task.id,
		user?.employee.id,
		user?.employee.organizationId,
		user?.tenantId
	]);

	return (
		<Card
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
						window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, task.id);
					}
				}}
				className="min-w-[48%] flex items-center h-full max-w-[50%]"
			>
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<div className="h-full  grow flex items-center justify-end gap-2">
				{viewListMode === 'searched' ? (
					<Button onClick={handleAddTask} variant="outline" className=" mon-h-12" type="button">
						{addToPlanLoading ? <SpinnerLoader variant="dark" size={20} /> : 'Add'}
					</Button>
				) : plan ? (
					<>
						<div className="h-full flex w-full items-center gap-1">
							{checkPastDate(plan.date) ? (
								<span
									className="h-6 w-28 flex items-center justify-center"
									style={{
										backgroundColor: status.taskStatuses.filter((s) => s.value === task.status)[0]
											.color
									}}
								>
									{task.status}
								</span>
							) : (
								<span>{t('dailyPlan.ESTIMATED')} :</span>
							)}

							<TaskEstimate showEditAndSaveButton={!checkPastDate(plan.date)} _task={task} />
						</div>
						<span className="w-4 h-full flex items-center justify-center">
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
		</Card>
	);
}

/**
 * ----------------------------------------------------------------
 * 		----------------- TASK CARD ACTIONS -------------------
 * ----------------------------------------------------------------
 */

interface ITaskCardActionsProps {
	task: ITeamTask;
	selectedPlan: IDailyPlan;
	openTaskDetailsModal: () => void;
	openUnplanActiveTaskModal: () => void;
}

/**
 * A Popover that contains task actions (view, edit, unplan)
 *
 * @param {object} props - The props object
 * @param {ITeamTask} props.task - The task on which actions will be performed
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
				.filter((plan) => plan.tasks && plan.tasks.find((_task) => _task.id == task.id))
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
						selectedPlan?.id &&
							(await removeTaskFromPlan(
								{ taskId: task.id, employeeId: user?.employee.id },
								selectedPlan?.id
							));
					}
				} else {
					selectedPlan?.id &&
						(await removeTaskFromPlan(
							{ taskId: task.id, employeeId: user?.employee.id },
							selectedPlan?.id
						));
				}

				closePopover();
			} catch (error) {
				console.log(error);
			}
		},
		[
			activeTeamTask?.id,
			isTodayPLan,
			openUnplanActiveTaskModal,
			removeTaskFromPlan,
			selectedPlan.id,
			task.id,
			timerStatus?.running,
			user?.employee.id
		]
	);

	return (
		<Popover>
			<Popover.Button className="w-4 h-full flex items-center justify-center border-none outline-none">
				<ThreeCircleOutlineVerticalIcon className="  dark:text-[#B1AEBC]" />
			</Popover.Button>

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
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card shadow="custom" className=" shadow-xlcard  !p-3 !rounded-lg !border-2">
								<ul className=" flex flex-col justify-end gap-3">
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
							</Card>
						);
					}}
				</Popover.Panel>
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
	taskId: string;
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
						await removeManyTaskPlans({ plansIds: planIds, employeeId: user?.employee.id }, taskId);
					}
				} else {
					await removeManyTaskPlans({ plansIds: planIds, employeeId: user?.employee.id }, taskId);
				}

				closePopover();
				// Close the task card actions popover as well
				closeActionPopover();
			} catch (error) {
				console.log(error);
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
			user?.employee.id
		]
	);

	return (
		<Popover>
			<Popover.Button>
				<span className={clsxm(' text-red-600 hover:font-semibold hover:transition-all')}>Unplan</span>
			</Popover.Button>

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
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card
								shadow="custom"
								className=" shadow-xlcard  min-w-max w-[11rem] flex flex-col justify-end !p-0 !rounded-lg !border-2"
							>
								<ul className="p-3 w-full flex flex-col border justify-end gap-3">
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
							</Card>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
