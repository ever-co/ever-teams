'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { TaskPropertyMenu } from '@/core/components/tasks/task-property-menu';
import { taskPropertySearchKey } from '@/core/components/tasks/task-property-trigger';
import { statusItemValue, statusMenuOption } from '@/core/components/tasks/task-status';
import { useActiveTaskStatus } from '@/core/hooks/tasks/use-active-task-status';
import { useTaskStatusValue } from '@/core/hooks/tasks/use-task-status';
import { cn } from '@/core/lib/helpers';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_ICON_ACTION } from './task-detail-recipes';

export function TaskIssueStatusMenu({
	task,
	fallbackColor
}: Readonly<{ task: TTask; fallbackColor: string | null | undefined }>) {
	const t = useTranslations();
	const statusValues = useTaskStatusValue();
	const { item, items, onChange } = useActiveTaskStatus({ task }, statusValues, 'status');
	const options = useMemo(() => items.map((entry, index) => statusMenuOption(entry, index, 'status')), [items]);
	let currentValue: string | undefined;
	if (item) {
		currentValue = statusItemValue(item);
	}
	const glyphColor = item?.bgColor ?? fallbackColor;
	const glyphName = currentValue ?? (task.status as string | undefined);

	const pickStatus = (value: string | undefined) => {
		if (value) {
			onChange(value);
		}
	};

	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => value === currentValue}
			onSelect={pickStatus}
			searchPlaceholder={t(taskPropertySearchKey('status'))}
			triggerLabel={t('common.STATUS')}
			triggerClassName={cn(DETAIL_ICON_ACTION, 'ml-1.5 size-6')}
			optionLabelClassName="capitalize"
		>
			<TaskPropertyIcon kind="status" name={glyphName} color={glyphColor} />
		</TaskPropertyMenu>
	);
}
