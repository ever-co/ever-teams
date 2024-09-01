/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@app/constants';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { PiWarningCircleFill } from 'react-icons/pi';
import { Card, InputField, Modal, SpinnerLoader, Text, VerticalSeparator } from 'lib/components';
import { Button } from '@components/ui/button';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser, useDailyPlan, useModal, useTeamTasks, useTimerView } from '@app/hooks';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { TaskEstimate } from '../task/task-estimate';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import clsx from 'clsx';
import { AddIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { estimatedTotalTime } from '../task/daily-plan';
import { clsxm } from '@app/utils';
import { TaskDetailsModal } from './task-details-modal';
import { formatIntegerToHour } from '@app/helpers';
import { Popover, Transition } from '@headlessui/react';
import Link from 'next/link';

interface IAddTasksEstimationHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan: IDailyPlan;
	tasks: ITeamTask[];
}

export function AddTasksEstimationHoursModal(props: IAddTasksEstimationHoursModalProps) {
	const { isOpen, closeModal, plan, tasks } = props;

	const t = useTranslations();
	const { updateDailyPlan, myDailyPlans } = useDailyPlan();
	const { startTimer } = useTimerView();
	const { activeTeam, activeTeamTask, setActiveTask } = useTeamTasks();

	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan.workTimePlanned);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const tasksEstimationTimes = useMemo(() => estimatedTotalTime(plan.tasks).timesEstimated / 3600, [plan.tasks]);
	const [warning, setWarning] = useState('');

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		closeModal();
		startTimer();
	}, [closeModal, currentDate, startTimer]);

	const handleSubmit = useCallback(() => {
		updateDailyPlan({ workTimePlanned }, plan.id ?? '');
		handleCloseModal();
	}, [handleCloseModal, plan.id, updateDailyPlan, workTimePlanned]);

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
					isOpen && setActiveTask(task);
				}
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} showCloseIcon={requirePlan ? false : true}>
			<Card className="w-full" shadow="custom">
				<div className="flex w-[32rem] flex-col justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							{t('timer.todayPlanSettings.TITLE')}
						</Text.Heading>
						<div className="mb-7 w-full flex flex-col gap-4">
							<span className="text-sm">
								{t('timer.todayPlanSettings.WORK_TIME_PLANNED')} <span className="text-red-600">*</span>
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
								<div className="h-full shrink-0 rounded-lg border w-10 flex items-center justify-center">
									<AddIcon className="w-4 h-4 text-dark dark:text-white" />
								</div>
							</div>
						</div>
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
								<div className="flex flex-col gap-1">
									{sortedTasks.map((task, index) => (
										<TaskCard plan={plan} key={index} task={task} />
									))}
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
							variant="outline"
							type="submit"
							className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
							onClick={handleCloseModal}
						>
							{t('common.SKIP_ADD_LATER')}
						</Button>
						<Button
							disabled={warning ? true : false}
							variant="default"
							type="submit"
							className={clsxm(
								'py-3 px-5 rounded-md font-light text-md dark:text-white',
								warning && 'bg-gray-400'
							)}
							onClick={handleSubmit}
						>
							{t('timer.todayPlanSettings.START_WORKING_BUTTON')}
						</Button>
					</div>
				</div>
			</Card>
		</Modal>
	);
}

interface ITaskCardProps {
	task: ITeamTask;
	plan: IDailyPlan;
}

function TaskCard({ task, plan }: ITaskCardProps) {
	const { setActiveTask, activeTeamTask, getTaskById } = useTeamTasks();
	const {
		isOpen: isTaskDetailsModalOpen,
		closeModal: closeTaskDetailsModal,
		openModal: openTaskDetailsModal
	} = useModal();

	const handleOpenTaskDetailsModal = useCallback(() => {
		// Update the detailed task state
		getTaskById(task.id);
		openTaskDetailsModal();
	}, [getTaskById, openTaskDetai

  const t = useTranslations();
    
	return (
		<Card
			shadow="custom"
			className={clsx(
				'lg:flex  items-center justify-between py-3  md:px-4 hidden min-h-[4.5rem] w-full h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				task.id === activeTeamTask?.id && 'border-primary-light border-[0.15rem]'
			)}
		>
			<div onClick={() => setActiveTask(task)} className="min-w-[48%] flex items-center h-full max-w-[50%]">
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<div className="h-full  grow flex items-center justify-end gap-2">
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
