'use client';
import { NoData } from '@/core/components';
import { useTranslations } from 'next-intl';
import { ReaderIcon } from '@radix-ui/react-icons';
import { FilterTabs } from '@/core/types/interfaces/task/task-card';

export function EmptyPlans({ planMode }: Readonly<{ planMode?: FilterTabs }>) {
	const t = useTranslations();

	return (
		<div className="xl:mt-20">
			<NoData
				text={planMode == 'Today Tasks' ? t('dailyPlan.NO_TASK_PLANNED_TODAY') : t('dailyPlan.NO_TASK_PLANNED')}
				component={<ReaderIcon className="w-14 h-14" />}
			/>
		</div>
	);
}
