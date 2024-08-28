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
import { estimatedTotalTime } from '../task/daily-plan';
import { clsxm } from '@app/utils';
import { formatIntegerToHour } from '@app/helpers';

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
										<TaskCard key={index} task={task} />
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
}

function TaskCard({ task }: ITaskCardProps) {
	const { setActiveTask, activeTeamTask } = useTeamTasks();
	const t = useTranslations();

	return (
		<Card
			shadow="custom"
			className={clsx(
				'lg:flex  items-center justify-between py-3  md:px-4 hidden min-h-[4.5rem] w-full h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				task.id === activeTeamTask?.id && 'border-primary-light border-[0.15rem]'
			)}
			onClick={() => setActiveTask(task)}
		>
			<div className="min-w-[48%] flex items-center h-full max-w-[50%]">
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<div className="h-full  grow flex items-center justify-end gap-2">
				<div className="h-full flex items-center justify-center gap-1">
					<span>{t('dailyPlan.ESTIMATED')} :</span> <TaskEstimate _task={task} />
				</div>
				<span className="w-4 h-full flex items-center justify-center">
					<ThreeCircleOutlineVerticalIcon className="  dark:text-[#B1AEBC]" />
				</span>
			</div>
		</Card>
	);
}
