import { useCallback, useEffect, useState } from 'react';
import { PiWarningCircleFill } from 'react-icons/pi';
import { IDailyPlan, ITeamTask, IUser } from '@app/interfaces';
import { Card, InputField, Modal, Text, VerticalSeparator } from 'lib/components';
import { useTranslations } from 'use-intl';
import { TaskNameInfoDisplay } from '../task/task-displays';
import { Button } from '@components/ui/button';
import { TaskEstimate } from '../task/task-estimate';
import { useAuthenticateUser, useAuthTeamTasks, useDailyPlan, useTeamTasks } from '@app/hooks';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ESTIMATE_POPUP_SHOWN_DATE, TODAY_PLAN_ALERT_SHOWN_DATE } from '@app/constants';

export function AddWorkTimeAndEstimatesToPlan({
	open,
	closeModal,
	plan,
	startTimer,
	hasPlan,
	cancelBtn
	// employee
}: {
	open: boolean;
	closeModal: () => void;
	startTimer: () => void;
	hasPlan: boolean;
	plan?: IDailyPlan;
	cancelBtn?: boolean;
	// employee?: OT_Member;
}) {
	const t = useTranslations();
	const [workTimePlanned, setworkTimePlanned] = useState<number | undefined>(plan?.workTimePlanned);

	useEffect(() => {
		if (typeof workTimePlanned === 'string') setworkTimePlanned(parseFloat(workTimePlanned));
	}, [workTimePlanned]);
	const { user } = useAuthenticateUser();

	const { updateDailyPlan, todayPlan: hasPlanToday } = useDailyPlan();

	const { tasks: $tasks, activeTeam } = useTeamTasks();
	const requirePlan = activeTeam?.requirePlanToTrack;
	const currentUser = activeTeam?.members?.find((member) => member.employee.userId === user?.id);

	const tasksEstimated = plan?.tasks?.some((t) => typeof t?.estimate === 'number' && t?.estimate <= 0);

	const tasks = $tasks.filter((task) => {
		return plan?.tasks?.some((t) => task?.id === t.id && typeof task?.estimate === 'number' && task?.estimate <= 0);
	});

	const currentDate = new Date().toISOString().split('T')[0];
	const lastPopupDate = window && window?.localStorage.getItem(TODAY_PLAN_ALERT_SHOWN_DATE);
	const lastPopupEstimates = window && window?.localStorage.getItem(ESTIMATE_POPUP_SHOWN_DATE);

	const hasWorkedToday = currentUser?.totalTodayTasks.reduce(
		(previousValue, currentValue) => previousValue + currentValue.duration,
		0
	);

	const handleSubmit = () => {
		if (requirePlan) {
			if (workTimePlanned === 0 || typeof workTimePlanned !== 'number') return;
			if (tasks.some((task) => task.estimate === 0)) return;
		}

		updateDailyPlan({ workTimePlanned }, plan?.id ?? '');
		startTimer();
		closeModal();
	};

	const handleCloseModal = useCallback(() => {
		closeModal();
		// startTimer();
		localStorage.setItem(ESTIMATE_POPUP_SHOWN_DATE, currentDate);
	}, [closeModal, currentDate]);

	const Content = () => {
		if (hasWorkedToday && hasWorkedToday > 0) {
			if ((!hasPlanToday || hasPlanToday.length === 0) && (!lastPopupDate || lastPopupDate !== currentDate)) {
				return <CreateTodayPlanPopup closeModal={closeModal} currentDate={currentDate} />;
			} else {
				if (
					(tasksEstimated || !plan?.workTimePlanned || plan?.workTimePlanned <= 0) &&
					(!lastPopupEstimates || lastPopupEstimates !== currentDate)
				) {
					return (
						<div className="flex flex-col justify-between">
							<div className="mb-7">
								<Text.Heading as="h3" className="mb-3 text-center">
									{t('timer.todayPlanSettings.TITLE')}
								</Text.Heading>
								{hasPlan && plan?.workTimePlanned && plan?.workTimePlanned <= 0 && (
									<div className="mb-7 w-full flex flex-col gap-4">
										<span className="text-sm">
											{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}{' '}
											<span className="text-red-600">*</span>
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
								)}
								{tasksEstimated && (
									<div className="text-sm flex flex-col gap-3">
										<UnEstimatedTasks
											dailyPlan={plan}
											requirePlan={!!requirePlan}
											hasPlan={hasPlan}
											user={user}
										/>

										<div className="flex gap-2 items-center text-red-500">
											<PiWarningCircleFill className="text-2xl" />
											<p>{t('timer.todayPlanSettings.WARNING_PLAN_ESTIMATION')}</p>
										</div>
									</div>
								)}
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
						)}

						<div className="mt-6 flex justify-between items-center">
							{
								cancelBtn ? (<Button
									variant="outline"
									type="submit"
									className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
									onClick={closeModal}
								>
									Cancel
								</Button>) :
									<Button
										variant="outline"
										type="submit"
										className="py-3 px-5 rounded-md font-light text-md dark:text-white dark:bg-slate-700 dark:border-slate-600"
										onClick={handleSubmit}
									>
										{t('common.SKIP_ADD_LATER')}
									</Button>
							}
							<Button
								variant="default"
								type="submit"
								className="py-3 px-5 rounded-md font-light text-md dark:text-white"
								onClick={handleSubmit}
							>
								{t('timer.todayPlanSettings.START_WORKING_BUTTON')}
							</Button>
						</div>
					);
				}
			}
		}
		return null;
	};

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative" showCloseIcon={false}>
			<Card className="w-full" shadow="custom">
				<Content />
			</Card>
		</Modal>
	);
}

function UnEstimatedTasks({
	requirePlan,
	hasPlan,
	dailyPlan,
	user
}: {
	requirePlan: boolean;
	hasPlan: boolean;
	dailyPlan?: IDailyPlan;
	user?: IUser;
}) {
	const t = useTranslations();

	const { tasks: $tasks } = useTeamTasks();
	const { assignedTasks } = useAuthTeamTasks(user);

	let tasks: ITeamTask[] = [];
	if (hasPlan) {
		tasks = $tasks.filter((task) =>
			dailyPlan?.tasks?.some(
				(t) => task?.id === t.id && typeof task?.estimate === 'number' && task?.estimate <= 0
			)
		);
	} else {
		if (!requirePlan) {
			tasks = assignedTasks.filter((task) => typeof task?.estimate === 'number' && task?.estimate <= 0);
		}
	}

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

export function CreateTodayPlanPopup({ closeModal, currentDate }: { closeModal: () => void; currentDate: string }) {
	const t = useTranslations();
	const { createDailyPlanLoading } = useDailyPlan();

	const handleCloseModal = useCallback(() => {
		closeModal();
		// startTimer();
		localStorage.setItem(TODAY_PLAN_ALERT_SHOWN_DATE, currentDate);
	}, [closeModal, currentDate]);

	return (
		<Card className="w-full" shadow="custom">
			<div className="flex flex-col items-center justify-between">
				<div className="mb-7">
					<Text.Heading as="h3" className="mb-3 text-center">
						{t('dailyPlan.CREATE_A_PLAN_FOR_TODAY')}
					</Text.Heading>

					<Text className="text-sm text-center text-gray-500">{t('dailyPlan.TODAY_PLAN_SUB_TITLE')}</Text>
					<Text className="text-sm text-center text-gray-500">{t('dailyPlan.DAILY_PLAN_DESCRIPTION')}</Text>
				</div>
				<div className="flex flex-col w-full gap-3">
					<Button
						variant="default"
						className="p-7 font-normal rounded-xl text-md"
						disabled={createDailyPlanLoading}
						onClick={handleCloseModal}
					>
						{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
						OK
					</Button>
				</div>
			</div>
		</Card>
	);
}
