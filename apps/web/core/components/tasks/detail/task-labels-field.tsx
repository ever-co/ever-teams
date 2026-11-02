'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from '@/core/components/icons';
import { Modal } from '@/core/components';
import { TaskLabelForm } from '@/core/components/tasks/task-labels-form';
import { TaskStatus } from '@/core/components/tasks/task-status';
import {
	TaskPropertyMenu,
	TaskPropertyMenuAction,
	type TaskPropertyMenuOption
} from '@/core/components/tasks/task-property-menu';
import { useTaskLabelsEditor } from '@/core/hooks/tasks/use-task-labels-editor';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import type { TStatusItem } from '@/core/types/interfaces/task/task-card';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { allowsLegacyDialogs, useTaskDetailHost } from './task-detail-host';
import { DETAIL_EMPTY_VALUE } from './task-detail-recipes';

const ADD_LABEL_BUTTON =
	'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hairline-border border-dashed border-foreground/25 transition-colors hover:border-foreground/45 hover:text-foreground [&_svg]:size-3.5';

function labelOption(name: string, item: TStatusItem): TaskPropertyMenuOption<string> {
	return { key: name, value: name, label: item.realName ?? item.name ?? name, icon: item.icon };
}

export function TaskLabelsField({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const host = useTaskDetailHost();
	const labelsByName = useTaskLabelsValue();
	const { selectedNames, toggle } = useTaskLabelsEditor(task);
	const [isCreating, setIsCreating] = useState(false);
	const canCreate = allowsLegacyDialogs(host);
	const hasLabels = selectedNames.length > 0;

	const options = useMemo(
		() => Object.entries(labelsByName).map(([name, item]) => labelOption(name, item)),
		[labelsByName]
	);

	const isSelected = useCallback((name: string) => selectedNames.includes(name), [selectedNames]);

	const trigger = (
		<span className={ADD_LABEL_BUTTON}>
			<Plus aria-hidden="true" />
		</span>
	);

	return (
		<>
			{selectedNames.map((name) => {
				const item = labelsByName[name];
				if (!item) {
					return null;
				}
				return <TaskStatus key={name} {...item} active={true} className="h-7 max-w-40" />;
			})}
			<TaskPropertyMenu
				options={options}
				isSelected={isSelected}
				onSelect={toggle}
				multiple={true}
				searchPlaceholder={t('taskMenus.search.label')}
				triggerLabel={t('taskDetail.properties.EDIT_LABELS')}
				triggerClassName="rounded-md"
				popupClassName="w-60"
				footer={
					canCreate && (
						<TaskPropertyMenuAction icon={<Plus />} onClick={() => setIsCreating(true)}>
							{t('taskMenus.actions.createLabel')}
						</TaskPropertyMenuAction>
					)
				}
			>
				{hasLabels && trigger}
				{!hasLabels && (
					<span className={DETAIL_EMPTY_VALUE}>
						<Plus aria-hidden="true" />
						{t('taskDetail.properties.ADD_LABEL')}
					</span>
				)}
			</TaskPropertyMenu>
			{isCreating && (
				<Modal isOpen={true} closeModal={() => setIsCreating(false)}>
					<div className="w-[330px] sm:w-[530px]">
						<TaskLabelForm onCreated={() => setIsCreating(false)} formOnly={true} />
					</div>
				</Modal>
			)}
		</>
	);
}
