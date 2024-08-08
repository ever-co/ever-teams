'use client';

import { COMPARE_PLANNED_AND_ESTIMATE_HOURS_MODAL_DATE } from '@app/constants';
import { useMemo, useCallback, useState } from 'react';
import { Card, InputField, Modal, Text, VerticalSeparator } from 'lib/components';
import { Button } from '@components/ui/button';
import { useTranslations } from 'next-intl';
import { useDailyPlan, useTeamTasks, useTimerView } from '@app/hooks';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { TaskEstimate } from '../task/task-estimate';
import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { ScrollArea } from '@components/ui/scroll-bar';

interface IComparePlannedAndEstimateModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan: IDailyPlan;
	tasks: ITeamTask[];
}

export function ComparePlannedAndEstimateModal(props: IComparePlannedAndEstimateModalProps) {
	const { isOpen, closeModal, plan, tasks } = props;

	const t = useTranslations();
	const { updateDailyPlan } = useDailyPlan();
	const { startTimer, timerStatus } = useTimerView();
	const { activeTeam } = useTeamTasks();

	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan.workTimePlanned);
	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(COMPARE_PLANNED_AND_ESTIMATE_HOURS_MODAL_DATE, currentDate);
		closeModal();
	}, [closeModal, currentDate]);

	const handleSubmit = useCallback(() => {
		updateDailyPlan({ workTimePlanned }, plan.id ?? '');
		if (!timerStatus?.running) {
			startTimer();
		}
		handleCloseModal();
	}, [handleCloseModal, plan.id, startTimer, timerStatus?.running, updateDailyPlan, workTimePlanned]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} showCloseIcon={requirePlan ? false : true}>
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col justify-between gap-4">
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

								<div className="flex h-[16rem] flex-col gap-1">
									<ScrollArea>
										{tasks.map((task, index) => (
											<Card
												key={index}
												shadow="custom"
												className={
													'lg:flex mb-1 items-center justify-between py-3 px-4 md:px-4 hidden min-h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs'
												}
											>
												<div className="min-w-[50%] max-w-[50%]">
													<TaskNameInfoDisplay task={task} />
												</div>
												<VerticalSeparator />
												<TaskEstimate _task={task} />
											</Card>
										))}
									</ScrollArea>
								</div>
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
							{t('common.CANCEL')}
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
					<div className="w-full flex flex-col text-xs gap-2 text-red-500">
						<p className="font-medium ">
							Total Estimates of all planned tasks should be approx the same as Planned work hours (+/-
							1h)
						</p>
						<p className=" text-black">Please, correct one of the more appropriate values:</p>
						<ul className="flex flex-col gap-1 text-black list-disc list-inside">
							<li>Planned work hours</li>
							<li>Reestimate task(s)</li>
							<li>Replan or Plan tasks</li>
						</ul>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
