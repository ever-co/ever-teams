import { TDailyPlan } from '@/core/types/schemas';
import { useTranslations } from 'next-intl';
import { estimatedTotalTime } from '@/core/hooks/daily-plans/daily-plan-totals';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';

/**
 * @deprecated Import from '@/core/hooks/daily-plans/daily-plan-totals'. Re-exported so the daily-plan barrel keeps
 * them; hooks still never import this component module, so the import cycle stays broken.
 */
export { estimatedTotalTime, getTotalTasks } from '@/core/hooks/daily-plans/daily-plan-totals';

const FIGURE_CLASS_NAME = 'inline-flex h-6 items-center gap-1.5 whitespace-nowrap';

const FIGURE_LABEL_CLASS_NAME = 'text-xs text-muted-foreground';

const FIGURE_VALUE_CLASS_NAME = 'text-[13px] font-medium tabular-nums text-foreground';

interface ITaskEstimatedCount {
	outstandingPlans: TDailyPlan[];
}

export function TaskEstimatedCount({ outstandingPlans }: Readonly<ITaskEstimatedCount>) {
	const tasksPerPlan = outstandingPlans?.map((plan: TDailyPlan) => plan.tasks || []);
	const { timesEstimated, totalTasks } = estimatedTotalTime(tasksPerPlan || []);
	const t = useTranslations();

	return (
		<div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1">
			<span className={FIGURE_CLASS_NAME}>
				<span className={FIGURE_LABEL_CLASS_NAME}>{t('dailyPlan.ESTIMATED')}</span>
				<span className={FIGURE_VALUE_CLASS_NAME}>{formatDurationShort(timesEstimated || 0)}</span>
			</span>
			<span className={FIGURE_CLASS_NAME}>
				<span className={FIGURE_LABEL_CLASS_NAME}>{t('dailyPlan.TOTAL_TASK')}</span>
				<span className={FIGURE_VALUE_CLASS_NAME}>{totalTasks ?? 0}</span>
			</span>
		</div>
	);
}
