'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { TASK_LIST_SURFACE } from '@/core/components/tasks/task-row-recipes';
import { FilterTabs } from '@/core/types/interfaces/task/task-card';

/** The empty state keeps the frame of the list it replaces: one surface where the rows would be. */
export function EmptyPlans({
	planMode,
	title,
	action
}: Readonly<{ planMode?: FilterTabs; title?: string; action?: ReactNode }>) {
	const t = useTranslations();
	const todayText = t('dailyPlan.NO_TASK_PLANNED_TODAY');
	const defaultText = t('dailyPlan.NO_TASK_PLANNED');

	function resolveText() {
		if (title) {
			return title;
		}
		if (planMode == 'Today Tasks') {
			return todayText;
		}
		return defaultText;
	}

	return (
		<div className={TASK_LIST_SURFACE}>
			<BlockEmptyMessage title={resolveText()} action={action} />
		</div>
	);
}
