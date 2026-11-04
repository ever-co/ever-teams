'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus } from '@/core/components/icons';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { TaskPropertySettingsKind, TaskPropertySettingsModel } from '@/core/lib/utils/settings-task-properties';
import { PropertyList, usePropertyListController } from './property-list';

interface TaskPropertySettingsBodyProps {
	kind: TaskPropertySettingsKind;
	title: string;
	description: string;
	model: TaskPropertySettingsModel;
	skeletonRows: number;
}

export function TaskPropertySettingsBody({
	kind,
	title,
	description,
	model,
	skeletonRows
}: Readonly<TaskPropertySettingsBodyProps>) {
	const t = useTranslations();
	const controller = usePropertyListController();
	const { openCreate } = controller;

	return (
		<SettingsPage
			title={title}
			description={description}
			actions={
				<Button type="button" onClick={() => openCreate()}>
					<Plus />
					{t('settings.taskProperties.ADD', { kind })}
				</Button>
			}
		>
			<PropertyList
				kind={kind}
				model={model}
				controller={controller}
				skeletonRows={skeletonRows}
				onDelete={model.remove}
			/>
		</SettingsPage>
	);
}
