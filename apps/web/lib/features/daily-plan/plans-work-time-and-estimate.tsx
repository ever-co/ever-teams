import { IDailyPlan, ITeamTask } from '@app/interfaces';
import { Card, InputField, Modal, Text, VerticalSeparator } from 'lib/components';
import { useTranslations } from 'use-intl';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { Button } from '@components/ui/button';
import { TaskEstimate } from '../task/task-estimate';
import { useState } from 'react';
import { useTeamTasks } from '@app/hooks';

export function AddWorkTimeAndEstimatesToPlan({
	open,
	closeModal,
	plan,
	startTimer
	// employee
}: {
	open: boolean;
	closeModal: () => void;
	startTimer: () => void;
	plan?: IDailyPlan;
	// employee?: OT_Member;
}) {
	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan?.workTimePlanned);
	const t = useTranslations();

	const { tasks: $tasks } = useTeamTasks();

	const tasks = $tasks.filter((task) =>
		plan?.tasks?.find((t) => task?.id === t.id && task?.estimate && task?.estimate <= 0)
	);
	const handleSubmit = () => {
		if (workTimePlanned === 0 || typeof workTimePlanned !== 'number') return;
		if (tasks.some((task) => task.estimate === 0)) return;

		startTimer();
	};

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative">
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							{t('timer.todayPlanSettings.TITLE')}
						</Text.Heading>
					</div>
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
							defaultValue={plan?.workTimePlanned ?? 0}
						/>
					</div>

					{plan?.tasks && plan?.tasks?.length > 0 && (
						<div className="text-sm flex flex-col gap-3">
							<UnEstimatedTasks dailyPlan={plan} />
						</div>
					)}

					<div className="mt-6 flex justify-between items-center">
						<Button
							variant="outline"
							type="submit"
							className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
							onClick={closeModal}
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
				</div>
			</Card>
		</Modal>
	);
}

function UnEstimatedTasks({ dailyPlan }: { dailyPlan?: IDailyPlan }) {
	const t = useTranslations();

	const { tasks: $tasks } = useTeamTasks();

	const tasks = $tasks.filter((task) =>
		dailyPlan?.tasks?.find((t) => task?.id === t.id && task?.estimate && task?.estimate <= 0)
	);

	return (
		<div>
			{tasks?.length > 0 && (
				<div className="text-sm flex flex-col gap-3">
					<span>
						{t('timer.todayPlanSettings.TASKS_WITH_NO_ESTIMATIOMS')} <span className="text-red-600">*</span>
					</span>
					<div className="flex flex-col gap-1">
						{tasks && tasks?.map((task) => <UnEstimatedTask key={task.id} task={task} />)}
					</div>
				</div>
			)}
		</div>
	);
}

export function UnEstimatedTask({ task }: { task: ITeamTask }) {
	return (
		<Card
			shadow="custom"
			className={
				'lg:flex items-center justify-between py-3 px-4 md:px-4 hidden min-h-[4.5rem] dark:bg-[#1E2025] border-[0.05rem] dark:border-[#FFFFFF0D] relative !text-xs'
			}
		>
			<div className="min-w-[50%] max-w-[50%]">
				<TaskNameInfoDisplay task={task} />
			</div>
			<VerticalSeparator />
			{/* <TaskEstimateInput memberInfo={memberInfo} edition={taskEdition} /> */}
			<TaskEstimate _task={task} />
		</Card>
	);
}
