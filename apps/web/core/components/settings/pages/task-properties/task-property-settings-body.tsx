'use client';

import type { ReactNode } from 'react';
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
	/** Next to Add in the header (the labels offer their catalog there). */
	secondaryAction?: ReactNode;
	/** Next to Add in the empty list. */
	emptyAction?: ReactNode;
}

export function TaskPropertySettingsBody({
	kind,
	title,
	description,
	model,
	skeletonRows,
	secondaryAction,
	emptyAction
}: Readonly<TaskPropertySettingsBodyProps>) {
	const t = useTranslations();
	const controller = usePropertyListController();
	const { openCreate } = controller;

	return (
		<SettingsPage
			title={title}
			description={description}
			actions={
				<>
					{secondaryAction}
					<Button type="button" onClick={() => openCreate()}>
						<Plus />
						{t('settings.taskProperties.ADD', { kind })}
					</Button>
				</>
			}
		>
			<PropertyList
				kind={kind}
				model={model}
				controller={controller}
				skeletonRows={skeletonRows}
				onDelete={model.remove}
				emptyAction={emptyAction}
			/>
		</SettingsPage>
	);
}
