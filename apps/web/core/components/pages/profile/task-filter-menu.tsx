'use client';

import { useTranslations } from 'next-intl';
import { useTaskStatusValue } from '@/core/hooks';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import type { IStatusType, useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import {
	PropertyFilterMenu,
	propertyFilterOptionsOf,
	type PropertyFilterCategory
} from '@/core/components/tasks/property-filter-menu';

type TaskFilterHook = Pick<
	ReturnType<typeof useTaskFilter>,
	'appliedStatusFilter' | 'setStatusFilterValues' | 'onResetStatusFilter'
>;

/** The profile's task filter: status, priority, size and labels, applied at once through `useTaskFilter`. */
export function TaskFilterMenu({ hook }: Readonly<{ hook: TaskFilterHook }>) {
	const t = useTranslations();
	const statusValues = useTaskStatusValue();
	const priorityValues = useTaskPrioritiesValue();
	const sizeValues = useTaskSizesValue();
	const labelValues = useTaskLabelsValue();

	const categories: PropertyFilterCategory<IStatusType>[] = [
		{ field: 'status', kind: 'status', label: t('common.STATUS'), options: propertyFilterOptionsOf(statusValues) },
		{
			field: 'priority',
			kind: 'priority',
			label: t('pages.taskDetails.PRIORITY'),
			options: propertyFilterOptionsOf(priorityValues)
		},
		{
			field: 'size',
			kind: 'size',
			label: t('pages.taskDetails.SIZE'),
			options: propertyFilterOptionsOf(sizeValues)
		},
		{ field: 'label', kind: 'label', label: t('common.LABELS'), options: propertyFilterOptionsOf(labelValues) }
	];

	return (
		<PropertyFilterMenu
			categories={categories}
			selection={hook.appliedStatusFilter}
			onChange={hook.setStatusFilterValues}
			onClear={hook.onResetStatusFilter}
		/>
	);
}
