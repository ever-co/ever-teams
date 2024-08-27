/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TASKS_ESTIMATE_HOURS_MODAL_DATE } from '@app/constants';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { PiWarningCircleFill } from 'react-icons/pi';
import { Card, InputField, Modal, Text, VerticalSeparator } from 'lib/components';
import { Button } from '@components/ui/button';
import { useTranslations } from 'next-intl';
import { useDailyPlan, useTeamTasks, useTimerView } from '@app/hooks';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { TaskEstimate } from '../task/task-estimate';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import clsx from 'clsx';
import { AddIcon, ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { Popover, Transition } from '@headlessui/react';
import { clsxm } from '@app/utils';
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
	const { updateDailyPlan } = useDailyPlan();
	const { startTimer } = useTimerView();
	const { activeTeam, activeTeamTask, setActiveTask } = useTeamTasks();

	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan.workTimePlanned);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(TASKS_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		closeModal();
		startTimer();
	}, [closeModal, currentDate, startTimer]);

	const handleSubmit = useCallback(() => {
		updateDailyPlan({ workTimePlanned }, plan.id ?? '');

		handleCloseModal();
	}, [handleCloseModal, plan.id, updateDailyPlan, workTimePlanned]);

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
				<div className="flex flex-col justify-between">
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
								<span>
									{t('timer.todayPlanSettings.TASKS_WITH_NO_ESTIMATIONS')}{' '}
									<span className="text-red-600">*</span>
								</span>
								<div className="flex flex-col gap-1">
									{sortedTasks.map((task, index) => (
										<TaskCard plan={plan} key={index} task={task} />
									))}
								</div>
							</div>
							<div className="flex gap-2 items-center text-red-500">
								<PiWarningCircleFill className="text-2xl" />
								<p>{t('timer.todayPlanSettings.WARNING_PLAN_ESTIMATION')}</p>
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
							variant="default"
							type="submit"
							className="py-3 px-5 rounded-md font-light text-md dark:text-white"
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
	const { setActiveTask, activeTeamTask } = useTeamTasks();

	return (
		<Card
			shadow="custom"
			className={clsx(
				'lg:flex  items-center justify-between py-3  md:px-4 hidden min-h-[4.5rem] w-[30rem] h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				task.id === activeTeamTask?.id && 'border-primary-light border-[0.15rem]'
			)}
		>
			<div onClick={() => setActiveTask(task)} className="min-w-[48%] flex items-center h-full max-w-[50%]">
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<div className="h-full  grow flex items-center justify-end gap-2">
				<div className="h-full flex items-center justify-center gap-1">
					<span>Estimation :</span> <TaskEstimate _task={task} />
				</div>
				<span className="w-4 h-full flex items-center justify-center">
					<TaskCardActions selectedPlan={plan} task={task} />
				</span>
			</div>
		</Card>
	);
}

interface ITaskCardActionsProps {
	task: ITeamTask;
	selectedPlan: IDailyPlan;
}

/**
 * A Popover that contents task actions (view, edit, unplan)
 *
 * @param {object} props - The props
 * @param {ITeamTask} props.task - The task actions will be performed
 * @param {IDailyPlan} props.selectedPlan - The currently selected plan
 *
 * @returns {JSX.Element} The Popover component.
 */

function TaskCardActions(props: ITaskCardActionsProps) {
	const { task, selectedPlan } = props;

	const { futurePlans, todayPlan } = useDailyPlan();

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
	 * A function that removes task from one or more plans
	 *
	 * @param {string} [taskId] - The task ID
	 * @param {string[]} [planIds] - The list of plan IDs
	 *
	 * @returns {void}
	 *
	 */
	const handleUplanTask = useCallback(
		(taskId: string, planIds: string[]) => {
			console.log(task.id, selectedPlan, otherPlanIds);
		},
		[otherPlanIds, selectedPlan, task.id]
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
					{() => {
						return (
							<Card shadow="custom" className=" shadow-xlcard  !p-3 !rounded-lg !border-2">
								<ul className=" flex flex-col justify-end gap-3">
									<li className="">
										<Link
											href={`/task/${task.id}`}
											className={clsxm('hover:font-semibold hover:transition-all')}
										>
											View
										</Link>
									</li>
									<li className={clsxm('hover:font-semibold hover:transition-all')}>Edit</li>

									{selectedPlan && selectedPlan.id && (
										<li>
											{otherPlanIds.length ? (
												<UplanTask
													taskId={task.id}
													selectedPlanId={selectedPlan.id}
													planIds={otherPlanIds}
													unplanHandler={handleUplanTask}
												/>
											) : (
												<span
													onClick={() => handleUplanTask(task.id, [selectedPlan.id!])}
													className={clsxm(
														' text-red-600 hover:font-semibold hover:transition-all'
													)}
												>
													Unplan
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
	unplanHandler: (taskId: string, planIds: string[]) => void;
}

/**
 * A Popover that contents unplan options (view, edit, unplan)
 *
 * @param {object} props - The props
 * @param {string} props.taskId - The task ID with which actions will be performed
 * @param {string} props.selectedPlanId - The currently selected plan id
 * @param {string[]} [props.planIds] - The plans's ids
 * @param {(taskId : string, planIds : string[]) => void} props.unplanHandler - The function to perform the action (unplan)
 *
 * @returns {JSX.Element} The Popover component.
 */

function UplanTask(props: IUnplanTaskProps) {
	const { taskId, selectedPlanId, planIds, unplanHandler } = props;
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
								className=" shadow-xlcard  min-w-max w-40 flex flex-col justify-end !p-0 !rounded-lg !border-2"
							>
								<ul className="p-3 w-full flex flex-col border justify-end gap-3">
									<li
										onClick={() => unplanHandler(taskId, [selectedPlanId])}
										className={clsxm('hover:font-semibold hover:transition-all shrink-0')}
									>
										Uplan selected date
									</li>
									<li
										onClick={() => unplanHandler(taskId, planIds)}
										className={clsxm('hover:font-semibold hover:transition-all')}
									>
										Unplan all
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
