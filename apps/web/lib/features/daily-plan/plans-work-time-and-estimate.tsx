import { useCallback, useEffect, useState } from 'react';
import { PiWarningCircleFill } from 'react-icons/pi';
import { DailyPlanStatusEnum, IDailyPlan, ITeamTask } from '@app/interfaces';
import { Card, InputField, Modal, Text, VerticalSeparator } from 'lib/components';
import { useTranslations } from 'use-intl';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { Button } from '@components/ui/button';
import { TaskEstimate } from '../task/task-estimate';
import { useAuthenticateUser, useDailyPlan, useTeamTasks } from '@app/hooks';
import { ReloadIcon } from '@radix-ui/react-icons';

export function AddWorkTimeAndEstimatesToPlan({
	open,
	closeModal,
	plan,
	startTimer,
	hasPlan
	// employee
}: {
	open: boolean;
	closeModal: () => void;
	startTimer: () => void;
	hasPlan: boolean;
	plan?: IDailyPlan;

	// employee?: OT_Member;
}) {
	const t = useTranslations();
	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan?.workTimePlanned);

	useEffect(() => {
		if (typeof workTimePlanned === 'string') setworkTimePlanned(parseFloat(workTimePlanned));
	}, [workTimePlanned]);

	const { updateDailyPlan } = useDailyPlan();

	const { tasks: $tasks, activeTeam } = useTeamTasks();

	const tasks = $tasks.filter((task) =>
		plan?.tasks?.some((t) => task?.id === t.id && typeof task?.estimate === 'number' && task?.estimate <= 0)
	);

	const handleSubmit = () => {
		const requirePlan = activeTeam?.requirePlanToTrack;
		if (requirePlan) {
			if (workTimePlanned === 0 || typeof workTimePlanned !== 'number') return;
			if (tasks.some((task) => task.estimate === 0)) return;
		}

		updateDailyPlan({ workTimePlanned }, plan?.id ?? '');
		startTimer();
		closeModal();
	};

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative">
			{hasPlan ? (
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

						{tasks.length > 0 && (
							<div className="text-sm flex flex-col gap-3">
								<UnEstimatedTasks dailyPlan={plan} />

								<div className="flex gap-2 items-center text-red-500">
									<PiWarningCircleFill className="text-2xl" />
									<p>{t('timer.todayPlanSettings.WARNING_PLAN_ESTIMATION')}</p>
								</div>
							</div>
						)}

						<div className="mt-6 flex justify-between items-center">
							<Button
								variant="outline"
								type="submit"
								className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
								onClick={handleSubmit}
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
			) : (
				<CreateTodayPlanPopup closeModal={closeModal} />
			)}
		</Modal>
	);
}

function UnEstimatedTasks({ dailyPlan }: { dailyPlan?: IDailyPlan }) {
	const t = useTranslations();

	const { tasks: $tasks } = useTeamTasks();

	const tasks = $tasks.filter((task) =>
		dailyPlan?.tasks?.some((t) => task?.id === t.id && typeof task?.estimate === 'number' && task?.estimate <= 0)
	);

	return (
		<div>
			{tasks?.length > 0 && (
				<div className="text-sm flex flex-col gap-3">
					<span>
						{t('timer.todayPlanSettings.TASKS_WITH_NO_ESTIMATIONS')} <span className="text-red-600">*</span>
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

export function CreateTodayPlanPopup({ closeModal }: { closeModal: () => void }) {
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	const { user } = useAuthenticateUser();
	const { activeTeam } = useTeamTasks();
	const member = activeTeam?.members.find((member) => member.employee.userId === user?.id);
	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned) || 0,
				date: toDay,
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId ?? '',
				employeeId: member?.employeeId,
				organizationId: member?.organizationId
			}).then(() => {
				closeModal();
			});
		},
		[closeModal, createDailyPlan, member?.employeeId, member?.organizationId, user?.tenantId]
	);

	return (
		<Card className="w-full" shadow="custom">
			<div className="flex flex-col items-center justify-between">
				<div className="mb-7">
					<Text.Heading as="h3" className="mb-3 text-center">
						CREATE A PLAN FOR TODAY
					</Text.Heading>

					<Text className="text-sm text-center text-gray-500">You are creating a new plan for today</Text>
				</div>
				<div className="flex flex-col w-full gap-3">
					<Button
						variant="default"
						className="p-7 font-normal rounded-xl text-md"
						disabled={createDailyPlanLoading}
						onClick={onSubmit}
					>
						{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
						OK
					</Button>
				</div>
			</div>
		</Card>
	);
}
