'use client';
import { checkPastDate } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { PropsWithChildren, useMemo } from 'react';

import { useAuthenticateUser, useCanSeeActivityScreen } from '@/core/hooks';

import { FilterTabs } from '@/core/types/daily-plan-types';
import { TDailyPlan } from '@/core/types/schemas';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { useGetTimeLogs } from '@/core/hooks/activities/time-logs/use-get-time-logs';
import { isTaskFinished } from '@/core/lib/helpers/task';
import { TASK_ROW_SKELETON_BAR } from '@/core/components/tasks/task-row-recipes';
import { PlannedTimeField } from './planned-time-field';
import { PlanMenu } from './plan-menu';

const DONE_METER_TICKS = 5;

const FIGURES_CLASS_NAME =
	'order-last flex basis-full flex-wrap items-center gap-x-4 gap-y-1 sm:order-none sm:ml-auto sm:basis-auto sm:justify-end';

const FIGURE_LABEL_CLASS_NAME = 'text-xs text-muted-foreground';

const FIGURE_VALUE_CLASS_NAME = 'text-[13px] font-medium tabular-nums text-foreground';

function PlanFigure({ label, children }: PropsWithChildren<{ label: string }>) {
	return (
		<span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap">
			<span className={FIGURE_LABEL_CLASS_NAME}>{label}</span>
			{children}
		</span>
	);
}

function filledTicksOf(done: number, total: number) {
	if (total <= 0) {
		return 0;
	}
	return Math.round((done / total) * DONE_METER_TICKS);
}

function DoneMeter({ done, total }: Readonly<{ done: number; total: number }>) {
	const filledTicks = filledTicksOf(done, total);
	return (
		<span aria-hidden="true" className="inline-flex items-center gap-0.5">
			{Array.from({ length: DONE_METER_TICKS }, (_, index) => (
				<span
					key={index}
					className={cn('h-2.5 w-1.5 rounded-[1px] bg-foreground/10', index < filledTicks && 'bg-primary')}
				/>
			))}
		</span>
	);
}

/** Time logged on the plan's tasks that day; mounted only while the group is open, since it is one read per plan. */
function PlanWorkedFigure({ plan }: Readonly<{ plan: TDailyPlan }>) {
	const t = useTranslations();
	const timeLogsQuery = useGetTimeLogs({
		startDate: plan.date,
		endDate: plan.date,
		taskIds: plan.tasks?.map((task) => task.id) || []
	});
	const timeLogs = timeLogsQuery.data;
	const totalWorkedSeconds = useMemo(() => {
		return timeLogs?.reduce((total, log) => total + (log.duration || 0), 0) || 0;
	}, [timeLogs]);
	const isPending = timeLogsQuery.isLoading;
	const hasFailed = timeLogsQuery.isError;
	const showsValue = !isPending && !hasFailed;

	return (
		<PlanFigure label={t('common.WORKED')}>
			{isPending && <span className={cn(TASK_ROW_SKELETON_BAR, 'h-3 w-10')} />}
			{hasFailed && <span className={FIGURE_VALUE_CLASS_NAME}>–</span>}
			{showsValue && <span className={FIGURE_VALUE_CLASS_NAME}>{formatDurationShort(totalWorkedSeconds)}</span>}
		</PlanFigure>
	);
}

function estimatedSecondsOf(plan: TDailyPlan) {
	const tasks = plan.tasks ?? [];
	return tasks.reduce((total, task) => {
		const estimate = task.estimate;
		if (typeof estimate === 'number') {
			return total + estimate;
		}
		return total;
	}, 0);
}

export function PlanHeader({
	plan,
	planMode,
	isOpen = true
}: {
	plan: TDailyPlan;
	planMode: FilterTabs;
	isOpen?: boolean;
}) {
	const { isTeamManager } = useAuthenticateUser();
	const canSeeActivity = useCanSeeActivityScreen();
	const t = useTranslations();

	const estimatedSeconds = useMemo(() => estimatedSecondsOf(plan), [plan]);
	const completedTasks = useMemo(
		() => plan.tasks?.filter((task) => isTaskFinished(task.status))?.length || 0,
		[plan.tasks]
	);
	const totalTasks = plan.tasks?.length || 0;

	const isFuturePlan = planMode === 'Future Tasks';
	const showsWorked = !isFuturePlan && isOpen;
	const showsDone = !isFuturePlan;
	const showsPlanMenu = isFuturePlan && canSeeActivity;
	// Past plans stay editable for a team manager only
	const canEditPlannedTime = !checkPastDate(plan.date) || isTeamManager;

	return (
		<>
			<div className={FIGURES_CLASS_NAME}>
				<PlanFigure label={t('dashboard.actualExpected.PLANNED')}>
					<PlannedTimeField plan={plan} canEdit={canEditPlannedTime} />
				</PlanFigure>
				<PlanFigure label={t('common.ESTIMATED')}>
					<span className={FIGURE_VALUE_CLASS_NAME}>{formatDurationShort(estimatedSeconds)}</span>
				</PlanFigure>
				{showsWorked && <PlanWorkedFigure plan={plan} />}
				{showsDone && (
					<PlanFigure label={t('pages.teamTasks.SCOPE_DONE')}>
						<span className={FIGURE_VALUE_CLASS_NAME}>{`${completedTasks} / ${totalTasks}`}</span>
						<DoneMeter done={completedTasks} total={totalTasks} />
					</PlanFigure>
				)}
			</div>
			{showsPlanMenu && (
				<span className="ml-auto inline-flex sm:ml-0">
					<PlanMenu plan={plan} />
				</span>
			)}
		</>
	);
}
