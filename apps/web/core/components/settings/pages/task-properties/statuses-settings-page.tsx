'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Layers, Plus, Task } from '@/core/components/icons';
import { DangerConsequence } from '@/core/components/settings/kit/danger';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useStatusDeletion } from '@/core/hooks/settings/use-status-deletion';
import { useStatusSettings } from '@/core/hooks/settings/use-status-settings';
import { PropertyDeleteConfirm } from './property-delete-dialog';
import { PropertyDeleteRenderProps, PropertyGroupKey, PropertyList, usePropertyListController } from './property-list';
import { StatusesSettingsSkeleton, STATUSES_SKELETON_ROWS } from './statuses-settings-skeleton';

function StatusDeleteDialog(props: Readonly<PropertyDeleteRenderProps>) {
	const t = useTranslations();
	const { usageCount, isCounting, remove } = useStatusDeletion(props.item);

	let tasksLine = t('settings.taskProperties.delete.STATUS_TASKS', { count: usageCount });
	if (isCounting) {
		tasksLine = t('settings.taskProperties.delete.STATUS_COUNTING');
	}
	const consequences: DangerConsequence[] = [
		{ key: 'choices', icon: <Layers />, text: t('settings.taskProperties.delete.CHOICES_GONE') },
		{ key: 'tasks', icon: <Task />, text: tasksLine }
	];

	return (
		<PropertyDeleteConfirm
			kind="status"
			consequences={consequences}
			isReady={!isCounting}
			onConfirm={remove}
			{...props}
		/>
	);
}

function renderStatusDeleteDialog(props: PropertyDeleteRenderProps) {
	return <StatusDeleteDialog {...props} />;
}

function StatusesSettingsContent() {
	const t = useTranslations();
	const model = useStatusSettings();
	const controller = usePropertyListController();
	const { openCreate } = controller;

	let headerGroup: PropertyGroupKey = 'all';
	if (model.isGrouped) {
		headerGroup = 'todo';
	}

	return (
		<SettingsPage
			title={t('settings.entries.statuses.TITLE')}
			description={t('settings.entries.statuses.DESCRIPTION')}
			actions={
				<Button type="button" onClick={() => openCreate(headerGroup)}>
					<Plus />
					{t('settings.taskProperties.ADD', { kind: 'status' })}
				</Button>
			}
		>
			<PropertyList
				kind="status"
				model={model}
				controller={controller}
				skeletonRows={STATUSES_SKELETON_ROWS}
				isGrouped={model.isGrouped}
				onMove={model.move}
				renderDeleteDialog={renderStatusDeleteDialog}
			/>
		</SettingsPage>
	);
}

export function StatusesSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<StatusesSettingsSkeleton />}>
			<StatusesSettingsContent />
		</TeamSettingsGate>
	);
}
