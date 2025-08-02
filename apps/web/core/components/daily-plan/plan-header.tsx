'use client';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon } from 'assets/svg';
import { checkPastDate } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { formatIntegerToHour } from '@/core/lib/helpers/index';
import { FilterTabs, useAuthenticateUser, useDailyPlan, useCanSeeActivityScreen } from '@/core/hooks';
import { TDailyPlan } from '@/core/types/schemas';
import { clsxm } from '@/core/lib/utils';
import { ReloadIcon } from '@radix-ui/react-icons';

import { VerticalSeparator } from '../duplicated-components/separator';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { Button } from '../duplicated-components/_button';
import { AlertPopup } from '../common/alert-popup';

export function PlanHeader({ plan, planMode }: { plan: TDailyPlan; planMode: FilterTabs }) {
	const [editTime, setEditTime] = useState<boolean>(false);
	const [time, setTime] = useState<number>(0);
	const [popupOpen, setPopupOpen] = useState(false);
	const { updateDailyPlan, updateDailyPlanLoading, deleteDailyPlan, deleteDailyPlanLoading } = useDailyPlan();
	const { isTeamManager } = useAuthenticateUser();
	const canSeeActivity = useCanSeeActivityScreen();
	const t = useTranslations();

	// Helper function to sum times
	const sumTimes = useCallback((tasks: TTask[], key: keyof TTask) => {
		return (
			tasks?.reduce((previousValue, currentValue) => {
				const value = currentValue[key];
				return previousValue + (typeof value === 'number' ? value : 0);
			}, 0) || 0
		);
	}, []);

	// Get all tasks's estimations time
	const estimatedTime = useMemo(() => sumTimes(plan.tasks || [], 'estimate'), [plan.tasks, sumTimes]);

	// Get all tasks's worked time
	const totalWorkTime = useMemo(() => sumTimes(plan.tasks || [], 'totalWorkedTime'), [plan.tasks, sumTimes]);

	// Get completed tasks
	const completedTasks = useMemo(
		() => plan.tasks?.filter((task) => task.status === 'completed')?.length || 0,
		[plan.tasks]
	);

	// Get ready tasks
	const readyTasks = useMemo(() => plan.tasks?.filter((task) => task.status === 'ready')?.length || 0, [plan.tasks]);

	// Get total tasks
	const totalTasks = useMemo(() => plan.tasks?.length || 0, [plan.tasks]);

	// Completion percent
	const completionPercent = totalTasks > 0 ? ((completedTasks * 100) / totalTasks).toFixed(0) : '0.0';

	// Smart layout: use justify-between only when delete button is present
	const shouldShowDeleteButton = planMode === 'Future Tasks' && canSeeActivity;
	const layoutClass = shouldShowDeleteButton ? 'justify-between' : 'justify-start';

	// Main content component - reusable for both layouts
	const MainContent = () => (
		<>
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

			{/* Total estimated time based on tasks */}
			<VerticalSeparator className="h-10" />

			<div className="flex gap-2 items-center">
				<span className="font-medium">{t('dailyPlan.ESTIMATED_TIME')} : </span>
				<span className="font-semibold">{formatIntegerToHour(estimatedTime / 3600)}</span>
			</div>

			{/* Conditional content based on planMode */}
			{planMode !== 'Future Tasks' && (
				<>
					<VerticalSeparator />
					{/* Total worked time for the plan */}
					<div className="flex gap-2 items-center">
						<span className="font-medium">{t('dailyPlan.TOTAL_TIME_WORKED')} : </span>
						<span className="font-semibold">{formatIntegerToHour(totalWorkTime / 3600)}</span>
					</div>

					<VerticalSeparator />
					{/* Completed tasks */}
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

					<VerticalSeparator />
					{/* Completion progress */}
					<div className="flex flex-col gap-3">
						<div className="flex gap-2 items-center">
							<span className="font-medium">{t('dailyPlan.COMPLETION')}: </span>
							<span className="font-semibold">{completionPercent}%</span>
						</div>
						<ProgressBar progress={`${completionPercent || 0}%`} showPercents={false} width="100%" />
					</div>
				</>
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
		</>
	);

	return (
		<div className={`flex gap-5 items-center mb-5 ${layoutClass}`}>
			{/* Main content - conditionally wrapped for Future Tasks */}
			{shouldShowDeleteButton ? (
				<div className="flex gap-5 items-center">
					<MainContent />
				</div>
			) : (
				<MainContent />
			)}

			{/* Delete Plan Button - Only for Future Tasks */}
			{shouldShowDeleteButton && (
				<div>
					<AlertPopup
						open={popupOpen}
						buttonOpen={
							<Button
								onClick={() => {
									setPopupOpen((prev) => !prev);
								}}
								variant="outline"
								className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
							>
								{t('common.plan.DELETE_THIS_PLAN')}
							</Button>
						}
					>
						<Button
							disabled={deleteDailyPlanLoading}
							onClick={async () => {
								try {
									if (plan?.id) {
										await deleteDailyPlan(plan.id);
									}
								} catch (error) {
									console.error(error);
								} finally {
									setPopupOpen(false);
								}
							}}
							variant="destructive"
							className="flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
						>
							{deleteDailyPlanLoading && <ReloadIcon className="mr-2 w-4 h-4 animate-spin" />}
							{t('common.DELETE')}
						</Button>
						<Button
							onClick={() => setPopupOpen(false)}
							variant="outline"
							className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
						>
							{t('common.CANCEL')}
						</Button>
					</AlertPopup>
				</div>
			)}
		</div>
	);
}
