'use client';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { checkPastDate } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { formatIntegerToHour } from '@/core/lib/helpers/index';
import { FilterTabs, useAuthenticateUser, useDailyPlan } from '@/core/hooks';
import { TDailyPlan } from '@/core/types/schemas';
import { clsxm } from '@/core/lib/utils';
import { ReloadIcon } from '@radix-ui/react-icons';

import { VerticalSeparator } from '../duplicated-components/separator';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function PlanHeader({ plan, planMode }: { plan: TDailyPlan; planMode: FilterTabs }) {
	const [editTime, setEditTime] = useState<boolean>(false);
	const [time, setTime] = useState<number>(0);
	const { updateDailyPlan, updateDailyPlanLoading } = useDailyPlan();
	const { isTeamManager } = useAuthenticateUser();
	const t = useTranslations();
	// Get all tasks's estimations time
	// Helper function to sum times
	const sumTimes = useCallback((tasks: TTask[], key: any) => {
		return (
			tasks
				?.map((task: any) => task[key])
				.filter((time): time is number => typeof time === 'number')
				.reduce((acc, cur) => acc + cur, 0) ?? 0
		);
	}, []);

	// Get all tasks' estimation and worked times
	const estimatedTime = useMemo(() => (plan.tasks ? sumTimes(plan.tasks, 'estimate') : 0), [plan.tasks]);
	const totalWorkTime = useMemo(() => (plan.tasks ? sumTimes(plan.tasks, 'totalWorkedTime') : 0), [plan.tasks]);

	// Get completed and ready tasks from a plan
	const completedTasks = useMemo(
		() => plan.tasks?.filter((task) => task.status === 'completed').length ?? 0,
		[plan.tasks]
	);

	const readyTasks = useMemo(() => plan.tasks?.filter((task) => task.status === 'ready').length ?? 0, [plan.tasks]);

	// Total tasks for the plan
	const totalTasks = plan.tasks?.length ?? 0;

	// Completion percent
	const completionPercent = totalTasks > 0 ? ((completedTasks * 100) / totalTasks).toFixed(0) : '0.0';

	return (
		<div
			className={`mb-5 flex ${
				planMode === 'Future Tasks' ? 'justify-start' : 'justify-around'
			}  items-center gap-5`}
		>
			{/* Planned Time */}

			<div className="flex gap-2 items-center">
				{!editTime && !updateDailyPlanLoading ? (
					<>
						<div>
							<span className="font-medium">{t('dailyPlan.PLANNED_TIME')} : </span>
							<span className="font-semibold">{formatIntegerToHour(plan.workTimePlanned)}</span>
						</div>
						{(!checkPastDate(plan.date) || isTeamManager) && (
							<EditPenBoxIcon
								className={clsxm('cursor-pointer lg:h-4 lg:w-4 w-2 h-2', 'dark:stroke-[#B1AEBC]')}
								onClick={() => setEditTime(true)}
							/>
						)}
					</>
				) : (
					<div className="flex">
						<input
							min={0}
							type="number"
							className={clsxm(
								'p-0 text-xs font-medium text-center bg-transparent border-b outline-none max-w-[54px]'
							)}
							onChange={(e) => setTime(parseFloat(e.target.value))}
						/>
						<span>
							{updateDailyPlanLoading ? (
								<ReloadIcon className="mr-2 w-4 h-4 animate-spin" />
							) : (
								<TickSaveIcon
									className="w-5 cursor-pointer"
									onClick={() => {
										updateDailyPlan({ workTimePlanned: time }, plan.id ?? '');
										setEditTime(false);
									}}
								/>
							)}
						</span>
					</div>
				)}
			</div>

			{/* Total estimated time  based on tasks */}
			<VerticalSeparator className="h-10" />

			<div className="flex gap-2 items-center">
				<span className="font-medium">{t('dailyPlan.ESTIMATED_TIME')} : </span>
				<span className="font-semibold">{formatIntegerToHour(estimatedTime / 3600)}</span>
			</div>

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/* Total worked time for the plan */}
			{planMode !== 'Future Tasks' && (
				<div className="flex gap-2 items-center">
					<span className="font-medium">{t('dailyPlan.TOTAL_TIME_WORKED')} : </span>
					<span className="font-semibold">{formatIntegerToHour(totalWorkTime / 3600)}</span>
				</div>
			)}

			{planMode !== 'Future Tasks' && <VerticalSeparator />}

			{/*  Completed tasks */}
			{planMode !== 'Future Tasks' && (
				<div>
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.COMPLETED_TASKS')} : </span>
						<span className="font-medium">{`${completedTasks}/${totalTasks}`}</span>
					</div>
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.READY')}: </span>
						<span className="font-medium">{readyTasks}</span>
					</div>
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.LEFT')}: </span>
						<span className="font-semibold">{totalTasks - completedTasks - readyTasks}</span>
					</div>
				</div>
			)}

			<VerticalSeparator />

			{/*  Completion progress */}
			{planMode !== 'Future Tasks' && (
				<div className="flex flex-col gap-3">
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.COMPLETION')}: </span>
						<span className="font-semibold">{completionPercent}%</span>
					</div>
					<ProgressBar progress={`${completionPercent || 0}%`} showPercents={false} width="100%" />
				</div>
			)}

			{/* Future tasks total plan */}
			{planMode === 'Future Tasks' && (
				<div>
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.PLANNED_TASKS')}: </span>
						<span className="font-semibold">{totalTasks}</span>
					</div>
				</div>
			)}
		</div>
	);
}
