import { secondsToTime } from '@/core/lib/helpers/index';
import { TDailyPlan } from '@/core/types/schemas';
import { useTranslations } from 'next-intl';
import { VerticalSeparator } from '../../duplicated-components/separator';
import { estimatedTotalTime } from '@/core/hooks/daily-plans/daily-plan-totals';

interface ITaskEstimatedCount {
	outstandingPlans: TDailyPlan[];
}
export function TaskEstimatedCount({ outstandingPlans }: ITaskEstimatedCount) {
	// Extract tasks from plans correctly - estimatedTotalTime expects array of task arrays
	const element = outstandingPlans?.map((plan: TDailyPlan) => plan.tasks || []);
	const { timesEstimated, totalTasks } = estimatedTotalTime(element || []);
	const { hours: hour, minutes: minute } = secondsToTime(timesEstimated || 0);
	const t = useTranslations();

	return (
		<div className="flex space-x-10">
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.ESTIMATED')} :</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">
					{hour}h{minute}m
				</span>
			</div>
			<VerticalSeparator className="border-slate-400" />
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.TOTAL_TASK')}:</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">{totalTasks}</span>
			</div>
		</div>
	);
}
