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
import { estimatedTotalTime } from '../task/daily-plan';

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
	const { activeTeam } = useTeamTasks();

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

	useEffect(() => {
		if (!workTimePlanned) {
			setWarning('Please add planned time');
		} else if (plan.tasks?.find((task) => task.estimate === null || task.estimate <= 0)) {
			setWarning('Please, estimate all tasks');
		}
	}, [workTimePlanned, tasksEstimationTimes, plan.tasks]);

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
									{tasks.map((task, index) => (
										<Card
											key={index}
											shadow="custom"
											className={
												'lg:flex items-center justify-between py-3 px-4 md:px-4 hidden min-h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs'
											}
										>
											<div className="min-w-[50%] max-w-[50%]">
												<TaskNameInfoDisplay task={task} />
											</div>
											<VerticalSeparator />
											<TaskEstimate _task={task} />
										</Card>
									))}
								</div>
							</div>
							<div className="flex gap-2 items-center text-red-500">
								<PiWarningCircleFill className="text-2xl" />
								<p>{warning}</p>
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
