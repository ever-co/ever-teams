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
	}, [closeModal, currentDate]);

	const handleSubmit = useCallback(() => {
		updateDailyPlan({ workTimePlanned }, plan.id ?? '');
		startTimer();
		handleCloseModal();
	}, [handleCloseModal, plan.id, startTimer, updateDailyPlan, workTimePlanned]);

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

							<InputField
								type="number"
								placeholder={t('timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER')}
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								onChange={(e) => setworkTimePlanned(parseFloat(e.target.value))}
								required
								min={0}
								value={workTimePlanned}
								defaultValue={plan.workTimePlanned ?? 0}
							/>
						</div>
						<div className="text-sm flex flex-col gap-3">
							<div className="text-sm flex flex-col gap-3">
								<span>
									{t('timer.todayPlanSettings.TASKS_WITH_NO_ESTIMATIONS')}{' '}
									<span className="text-red-600">*</span>
								</span>
								<div className="flex flex-col gap-1">
									{sortedTasks.map((task, index) => (
										<TaskCard key={index} task={task} />
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
}

function TaskCard({ task }: ITaskCardProps) {
	const { setActiveTask, activeTeamTask } = useTeamTasks();

	return (
		<Card
			shadow="custom"
			className={clsx(
				'lg:flex items-center justify-between py-3 px-4 md:px-4 hidden min-h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs cursor-pointer',
				task.id === activeTeamTask?.id && 'border-primary-light border-[0.15rem]'
			)}
			onClick={() => setActiveTask(task)}
		>
			<div className="min-w-[50%] max-w-[50%]">
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			<TaskEstimate _task={task} />
		</Card>
	);
}
