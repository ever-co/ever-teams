import { Modal, Text } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { clsxm } from '@/core/lib/utils';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { useDailyPlan, useTeamTasks, useTimerView } from '@/core/hooks';
import { RadioGroup } from '@headlessui/react';
import { DEFAULT_PLANNED_TASK_ID } from '@/core/constants/config/constants';
import { Card } from '../../duplicated-components/card';
import { ITask } from '@/core/types/interfaces/task/ITask';

/**
 * A Modal that suggests the user to change the active task to a task from the today's plan.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {ITask} props.defaultPlannedTask - The default task from the Today's plan
 *
 * @returns {JSX.Element} The modal element
 */
export function ActiveTaskHandlerModal({
	open,
	closeModal,
	defaultPlannedTask
}: {
	open: boolean;
	closeModal: () => void;
	defaultPlannedTask: ITask;
}) {
	const t = useTranslations();
	const { startTimer, hasPlan: todayPlan } = useTimerView();
	const { activeTeamTask, setActiveTask } = useTeamTasks();
	const { addTaskToPlan } = useDailyPlan();

	const [selectedOption, setSelectedOption] = useState<number>();

	const handleCloseModal = useCallback(() => {
		closeModal();
		startTimer();
	}, [closeModal, startTimer]);

	const options = useMemo(
		() => [
			{
				id: 0,
				description: 'Change to planned default task',
				action: async () => {
					if (defaultPlannedTask) {
						setActiveTask(defaultPlannedTask);
					}
				}
			},
			{
				id: 1,
				description: 'Add the task as default to the plan',
				action: async () => {
					try {
						if (todayPlan && todayPlan.id && activeTeamTask) {
							await addTaskToPlan({ taskId: activeTeamTask.id }, todayPlan.id);
						}

						activeTeamTask &&
							window &&
							window.localStorage.setItem(DEFAULT_PLANNED_TASK_ID, activeTeamTask.id);
					} catch (error) {
						console.log(error);
					}
				}
			},
			{
				id: 2,
				description: 'Add the task AND work on the default task',
				action: async () => {
					try {
						if (todayPlan && todayPlan.id && activeTeamTask) {
							await addTaskToPlan({ taskId: activeTeamTask.id }, todayPlan.id);
						}
						if (defaultPlannedTask) {
							setActiveTask(defaultPlannedTask);
						}
					} catch (error) {
						console.log(error);
					}
				}
			}
		],
		[activeTeamTask, addTaskToPlan, defaultPlannedTask, setActiveTask, todayPlan]
	);

	const handleSubmit = useCallback(() => {
		selectedOption !== undefined && options[selectedOption].action();
		handleCloseModal();
	}, [handleCloseModal, options, selectedOption]);

	return (
		<Modal isOpen={open} closeModal={handleCloseModal} className="w-[98%] md:w-[530px] relative">
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 uppercase text-center">
							{t('dailyPlan.chang_active_task_popup.TITLE')}
						</Text.Heading>

						<Text className="text-sm text-center text-gray-500">
							{t('dailyPlan.chang_active_task_popup.MESSAGE', {
								defaultPlannedTask: defaultPlannedTask.taskNumber,
								activeTask: activeTeamTask?.taskNumber
							})}
						</Text>
					</div>

					<div className="mx-auto w-full max-w-md">
						<RadioGroup value={selectedOption} onChange={setSelectedOption}>
							{options.map((option) => {
								return (
									<RadioGroup.Option key={option.id} value={option.id}>
										{({ checked }) => (
											<div className={clsxm('flex items-center gap-2 cursor-pointer')}>
												<span
													className={clsxm(
														'h-4 w-4 p-[1px] border border-primary rounded-full flex items-center justify-center'
													)}
												>
													<span
														className={clsxm(
															'w-full h-full rounded-full',
															checked && 'bg-primary'
														)}
													></span>
												</span>
												<span>{option.description}</span>
											</div>
										)}
									</RadioGroup.Option>
								);
							})}
						</RadioGroup>
					</div>

					<div className="mt-7 w-full flex justify-between items-center">
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
							className={clsxm('py-3 px-5 rounded-md font-light text-md dark:text-white')}
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
