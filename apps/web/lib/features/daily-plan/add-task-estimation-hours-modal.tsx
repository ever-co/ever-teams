/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@app/constants';
import { useMemo, useCallback, useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { PiWarningCircleFill } from 'react-icons/pi';
import { Card, InputField, Modal, SpinnerLoader, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { Button } from '@components/ui/button';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser, useDailyPlan, useModal, useTaskStatus, useTeamTasks, useTimerView } from '@app/hooks';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { TaskEstimate } from '../task/task-estimate';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import clsx from 'clsx';
import { AddIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { estimatedTotalTime } from '../task/daily-plan';
import { clsxm } from '@app/utils';
import { formatIntegerToHour } from '@app/helpers';
import { DEFAULT_PLANNED_TASK_ID } from '@app/constants';
import { ActiveTaskHandlerModal } from './active-task-handler-modal';
import { TaskDetailsModal } from './task-details-modal';
import { Popover, Transition } from '@headlessui/react';
import { ScrollArea, ScrollBar } from '@components/ui/scroll-bar';
import { Cross2Icon } from '@radix-ui/react-icons';

interface IAddTasksEstimationHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan: IDailyPlan;
	tasks: ITeamTask[];
}

export function AddTasksEstimationHoursModal(props: IAddTasksEstimationHoursModalProps) {
	const { isOpen, closeModal, plan, tasks } = props;
	const {
		isOpen: isActiveTaskHandlerModalOpen,
		closeModal: closeActiveTaskHandlerModal,
		openModal: openActiveTaskHandlerModal
	} = useModal();

	const t = useTranslations();
	const { updateDailyPlan, myDailyPlans } = useDailyPlan();
	const { startTimer } = useTimerView();
	const { activeTeam, activeTeamTask, setActiveTask } = useTeamTasks();
	const [showSearchInput, setShowSearchInput] = useState(false);
	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan.workTimePlanned);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const tasksEstimationTimes = useMemo(() => estimatedTotalTime(plan.tasks).timesEstimated / 3600, [plan.tasks]);
	const [warning, setWarning] = useState('');
	const [loading, setLoading] = useState(false);
	const [defaultTask, setDefaultTask] = useState<ITeamTask | null>(null);
	const isActiveTaskPlanned = useMemo(
		() => plan.tasks?.some((task) => task.id == activeTeamTask?.id),
		[activeTeamTask?.id, plan.tasks]
	);

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		closeModal();
	}, [closeModal, currentDate]);

	/**
	 * The function that close the Planned tasks modal when the user ignores the modal (Today's plan)
	 */
	const closeModalAndStartTimer = useCallback(() => {
		handleCloseModal();
		startTimer();
	}, [handleCloseModal, startTimer]);

	/**
	 * The function that opens the Change task modal if conditions are met (or start the timer)
	 */
	const handleChangActiveTask = useCallback(() => {
		if (isActiveTaskPlanned) {
			if (defaultTask?.id !== activeTeamTask?.id) {
				setActiveTask(defaultTask);
			}
			startTimer();
		} else {
			openActiveTaskHandlerModal();
		}
	}, [activeTeamTask?.id, defaultTask, isActiveTaskPlanned, openActiveTaskHandlerModal, setActiveTask, startTimer]);

	/**
	 * The function which is called when the user clicks on the 'Start working' button
	 */
	const handleSubmit = useCallback(async () => {
		try {
			setLoading(true);

			// Update the plan work time only if the user changed it
			plan.workTimePlanned !== workTimePlanned && (await updateDailyPlan({ workTimePlanned }, plan.id ?? ''));

			handleChangActiveTask();
			handleCloseModal();
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	}, [handleChangActiveTask, handleCloseModal, plan.id, plan.workTimePlanned, updateDailyPlan, workTimePlanned]);

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
		if (!workTimePlanned || workTimePlanned <= 0) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.PLANNED_TIME'));
		} else if (plan.tasks?.find((task) => !task.estimate)) {
			setWarning(t('dailyPlan.planned_tasks_popup.warning.TASKS_ESTIMATION'));
		} else if (Math.abs(workTimePlanned - tasksEstimationTimes) > 1) {
			checkPlannedAndEstimateTimeDiff();
		} else {
			setWarning('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workTimePlanned, tasksEstimationTimes, plan.tasks, myDailyPlans]);

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

	return (
		<>
			<Modal isOpen={isOpen} closeModal={closeModalAndStartTimer} showCloseIcon={requirePlan ? false : true}>
				<Card className="w-[36rem]" shadow="custom">
					<div className="flex w-full flex-col justify-between">
						<div className="mb-7 w-full">
							<Text.Heading as="h3" className="mb-3 text-center">
								{t('timer.todayPlanSettings.TITLE')}
							</Text.Heading>
							{showSearchInput ? (
								<SearchTaskInput
									defaultTask={defaultTask}
									setDefaultTask={setDefaultTask}
									setShowSearchInput={setShowSearchInput}
									selectedPlan={plan}
								/>
							) : (
								<div className="mb-7 w-full flex flex-col gap-3">
									<span className="text-sm">
										{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}{' '}
										<span className="text-red-600">*</span>
									</span>
									<div className="w-full flex gap-3 h-[3rem]">
										<InputField
											type="number"
											placeholder={t('timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER')}
											className="h-full"
											wrapperClassName=" h-full"
											onChange={(e) => setworkTimePlanned(parseFloat(e.target.value))}
											required
											noWrapper
											min={0}
											value={workTimePlanned}
											defaultValue={plan.workTimePlanned ?? 0}
										/>
										<button
											onClick={() => {
												setShowSearchInput(true);
											}}
											className="h-full shrink-0 rounded-lg border w-10 flex items-center justify-center"
										>
											<AddIcon className="w-4 h-4 text-dark dark:text-white" />
										</button>
									</div>
								</div>
							)}

							<div className="text-sm flex flex-col gap-3">
								<div className="text-sm flex flex-col gap-3">
									<div className="text-sm flex flex-col gap-3">
										<div className="w-full flex items-center justify-between gap-2">
											<div className="flex items-center justify-center gap-1">
												<span>{t('task.TITLE_PLURAL')}</span>
												<span className="text-red-600">*</span>
											</div>
											<div className="flex items-center justify-center gap-1">
												<span>{t('dailyPlan.TOTAL_ESTIMATED')} :</span>
												<span className=" font-medium">
													{formatIntegerToHour(tasksEstimationTimes)}
												</span>
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
									<div className="flex gap-2 text-sm h-6 text-red-500">
										{warning && (
											<>
												<PiWarningCircleFill />
												<span>{warning}</span>
											</>
										)}
									</div>
								</div>
							</div>
							<div className="mt-6 flex justify-between items-center">
								<Button
									disabled={loading}
									variant="outline"
									type="submit"
									className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
									onClick={closeModalAndStartTimer}
								>
									{t('common.SKIP_ADD_LATER')}
								</Button>
								<Button
									disabled={warning || loading ? true : false}
									variant="default"
									type="submit"
									className={clsxm(
										'py-3 px-5 w-40 rounded-md font-light flex items-center justify-center text-md dark:text-white',
										warning && 'bg-gray-400'
									)}
									onClick={handleSubmit}
								>
									{loading ? (
										<SpinnerLoader variant="light" size={20} />
									) : (
										t('timer.todayPlanSettings.START_WORKING_BUTTON')
									)}
								</Button>
							</div>
						</div>
					</div>
				</Card>
			</Modal>
			{defaultTask && (
				<ActiveTaskHandlerModal
					defaultPlannedTask={defaultTask}
					open={isActiveTaskHandlerModalOpen}
					closeModal={closeActiveTaskHandlerModal}
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
	selectedPlan: IDailyPlan;
	setShowSearchInput: Dispatch<SetStateAction<boolean>>;
	setDefaultTask: Dispatch<SetStateAction<ITeamTask | null>>;
	defaultTask: ITeamTask | null;
}

/**
 * Search task input
 *
 * @param {Object} props - The props object
 * @param {string} props.selectedPlan - The selected plan
 * @param {Dispatch<SetStateAction<boolean>>} props.setShowSearchInput - A setter for (showing / hiding) the input
 * @param {Dispatch<SetStateAction<ITeamTask>>} props.setDefaultTask - A function that sets default planned task
 * @param {ITeamTask} props.defaultTask - The default planned task
 *
 * @returns The Search input component
 */
function SearchTaskInput(props: ISearchTaskInputProps) {
	const { selectedPlan, setShowSearchInput, defaultTask, setDefaultTask } = props;
	const { tasks: teamTasks, createTask } = useTeamTasks();
	const { taskStatus } = useTaskStatus();
	const [taskName, setTaskName] = useState('');
	const [tasks, setTasks] = useState<ITeamTask[]>([]);
	const [createTaskLoading, setCreateTaskLoading] = useState(false);
	const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
	const t = useTranslations();

	// The ref for the popover button (rendered as an input)
	const searchInputRef = useRef<HTMLButtonElement>(null);

	const isTaskPlanned = useCallback(
		(taskId: string) => {
			return selectedPlan?.tasks?.some((task) => task.id == taskId);
		},
		[selectedPlan.tasks]
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
	}, [isTaskPlanned, selectedPlan.tasks, taskName, teamTasks]);

	const handleCreateTask = useCallback(async () => {
		try {
			setCreateTaskLoading(true);
			if (taskName.trim().length < 5) return;
			await createTask({
				taskName: taskName.trim(),
				status: taskStatus[0].name,
				taskStatusId: taskStatus[0].id,
				issueType: 'Bug' // TODO: Let the user choose the issue type
			});
		} catch (error) {
			console.log(error);
		} finally {
			setCreateTaskLoading(false);
		}
	}, [createTask, taskName, taskStatus]);

	/**
	 * Focus on the search input when the popover is mounted.
	 */
	useEffect(() => {
		searchInputRef.current?.focus();
	}, []);

	return (
		<Popover className={clsxm('relative z-20 w-full')}>
			<div className="mb-7 w-full flex flex-col gap-3 items-start">
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

			<Popover.Panel static={isSearchInputFocused} className={clsxm('absolute -mt-6 w-full')}>
				{tasks.length ? (
					<Card shadow="custom" className="h-[26rem] border shadow-lg !p-3">
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
	plan: IDailyPlan;
	viewListMode?: 'planned' | 'searched';
}

function TaskCard(props: ITaskCardProps) {
	const { task, plan, viewListMode = 'planned', isDefaultTask, setDefaultTask } = props;
	const { getTaskById } = useTeamTasks();
	const { addTaskToPlan } = useDailyPlan();
	const [addToPlanLoading, setAddToPlanLoading] = useState(false);
	const {
		isOpen: isTaskDetailsModalOpen,
		closeModal: closeTaskDetailsModal,
		openModal: openTaskDetailsModal
	} = useModal();

	const handleOpenTaskDetailsModal = useCallback(() => {
		// Update the detailed task state
		getTaskById(task.id);
		openTaskDetailsModal();
	}, [getTaskById, openTaskDetailsModal, task.id]);

	const t = useTranslations();

	/**
	 * The function that adds the task to the selected plan
	 */
	const handleAddTask = useCallback(async () => {
		try {
			setAddToPlanLoading(true);

			if (plan.id) await addTaskToPlan({ taskId: task.id }, plan.id);
		} catch (error) {
			console.log(error);
		} finally {
			setAddToPlanLoading(false);
		}
	}, [addTaskToPlan, plan.id, task.id]);

	return (
		<Card
			shadow="custom"
			className={clsx(
				'lg:flex  items-center justify-between py-3  md:px-4 hidden min-h-[4.5rem] w-full h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				isDefaultTask && 'border-primary-light border-[0.15rem]'
			)}
		>
			<div
				onClick={() => {
					setDefaultTask(task);
					window && window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, task.id);
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
				) : (
					<>
						<div className="h-full flex items-center justify-center gap-1">
							<span>{t('dailyPlan.ESTIMATED')} :</span> <TaskEstimate _task={task} />
						</div>
						<span className="w-4 h-full flex items-center justify-center">
							<TaskCardActions
								openTaskDetailsModal={handleOpenTaskDetailsModal}
								selectedPlan={plan}
								task={task}
							/>
						</span>
					</>
				)}
			</div>
			<TaskDetailsModal task={task} isOpen={isTaskDetailsModalOpen} closeModal={closeTaskDetailsModal} />
		</Card>
	);
}

interface ITaskCardActionsProps {
	task: ITeamTask;
	selectedPlan: IDailyPlan;
	openTaskDetailsModal: () => void;
}

/**
 * A Popover that contains task actions (view, edit, unplan)
 *
 * @param {object} props - The props object
 * @param {ITeamTask} props.task - The task on which actions will be performed
 * @param {IDailyPlan} props.selectedPlan - The currently selected plan
 * @param {() => void} props.openTaskDetailsModal - A function that opens a task details modal
 *
 * @returns {JSX.Element} The Popover component.
 */

function TaskCardActions(props: ITaskCardActionsProps) {
	const { task, selectedPlan, openTaskDetailsModal } = props;
	const { user } = useAuthenticateUser();
	const { futurePlans, todayPlan, removeTaskFromPlan, removeTaskFromPlanLoading } = useDailyPlan();

	const otherPlanIds = useMemo(
		() =>
			[...futurePlans, ...todayPlan]
				// Remove selected plan
				.filter((plan) => plan.id! !== selectedPlan.id)
				.filter((plan) => plan.tasks && plan.tasks.find((_task) => _task.id == task.id))
				.map((plan) => plan.id!),
		[futurePlans, selectedPlan.id, task.id, todayPlan]
	);

	/**
	 * Unplan selected task
	 */
	const unplanSelectedDate = useCallback(
		async (closePopover: () => void) => {
			try {
				selectedPlan?.id &&
					(await removeTaskFromPlan({ taskId: task.id, employeeId: user?.employee.id }, selectedPlan?.id));

				closePopover();
			} catch (error) {
				console.log(error);
			}
		},
		[removeTaskFromPlan, selectedPlan.id, task.id, user?.employee.id]
	);

	return (
		<Popover>
			<Popover.Button className="w-4 h-full flex items-center justify-center border-none outline-none">
				<ThreeCircleOutlineVerticalIcon className="  dark:text-[#B1AEBC]" />
			</Popover.Button>

			<Transition
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
									<li onClick={openTaskDetailsModal} className="">
										View
									</li>
									<li className={clsxm('hover:font-semibold hover:transition-all')}>Edit</li>

									{selectedPlan && selectedPlan.id && (
										<li>
											{otherPlanIds.length ? (
												<UnplanTask
													taskId={task.id}
													selectedPlanId={selectedPlan.id}
													planIds={[selectedPlan.id, ...otherPlanIds]}
													closeActionPopover={close}
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
													{removeTaskFromPlanLoading ? <SpinnerLoader size={10} /> : 'Unplan'}
												</span>
											)}
										</li>
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

interface IUnplanTaskProps {
	taskId: string;
	selectedPlanId: string;
	planIds: string[];
	closeActionPopover: () => void;
}

/**
 * A Popover that contains unplan options (unplan selected date, unplan all dates)
 *
 * @param {object} props - The props object
 * @param {string} props.taskId - The task id
 * @param {string} props.selectedPlanId - The currently selected plan id
 * @param {string[]} [props.planIds] - Others plans's ids
 * @param {() => void} props.closeActionPopover - The function to close the task card actions popover
 *
 * @returns {JSX.Element} The Popover component.
 */

function UnplanTask(props: IUnplanTaskProps) {
	const { taskId, selectedPlanId, planIds, closeActionPopover } = props;
	const { user } = useAuthenticateUser();
	const { removeTaskFromPlan, removeTaskFromPlanLoading, removeManyTaskPlans, removeManyTaskFromPlanLoading } =
		useDailyPlan();

	/**
	 * Unplan selected task
	 */
	const unplanSelectedDate = useCallback(
		async (closePopover: () => void) => {
			try {
				await removeTaskFromPlan({ taskId: taskId, employeeId: user?.employee.id }, selectedPlanId);

				closePopover();
				// Close the task card actions popover as well
				closeActionPopover();
			} catch (error) {
				console.log(error);
			}
		},
		[closeActionPopover, removeTaskFromPlan, selectedPlanId, taskId, user?.employee.id]
	);

	/**
	 * Unplan all tasks
	 */
	const unplanAll = useCallback(
		async (closePopover: () => void) => {
			try {
				await removeManyTaskPlans({ plansIds: planIds, employeeId: user?.employee.id }, taskId);

				closePopover();
				// Close the task card actions popover as well
				closeActionPopover();
			} catch (error) {
				console.log(error);
			}
		},
		[closeActionPopover, planIds, removeManyTaskPlans, taskId, user?.employee.id]
	);

	return (
		<Popover>
			<Popover.Button>
				<span className={clsxm(' text-red-600 hover:font-semibold hover:transition-all')}>Unplan</span>
			</Popover.Button>

			<Transition
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
											!removeTaskFromPlanLoading && 'hover:font-semibold hover:transition-all '
										)}
									>
										{removeTaskFromPlanLoading ? (
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
