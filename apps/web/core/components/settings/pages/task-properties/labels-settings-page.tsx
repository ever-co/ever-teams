'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { LayoutGrid } from '@/core/components/icons';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useAddCatalogLabels } from '@/core/hooks/settings/use-add-catalog-labels';
import { useLabelSettings } from '@/core/hooks/settings/use-label-settings';
import { LabelCatalogDialog } from './label-catalog-dialog';
import { LabelsSettingsSkeleton, LABELS_SKELETON_ROWS } from './labels-settings-skeleton';
import { TaskPropertySettingsBody } from './task-property-settings-body';

function LabelsSettingsContent() {
	const t = useTranslations();
	const model = useLabelSettings();
	const { addLabels } = useAddCatalogLabels();
	const [isCatalogOpen, setIsCatalogOpen] = useState(false);
	const existingNames = useMemo(() => model.items.map((item) => item.name), [model.items]);
	const openCatalog = () => setIsCatalogOpen(true);
	const browseLabel = t('settings.labelCatalog.BROWSE');

	return (
		<>
			<TaskPropertySettingsBody
				kind="label"
				title={t('settings.entries.labels.TITLE')}
				description={t('settings.entries.labels.DESCRIPTION')}
				model={model}
				skeletonRows={LABELS_SKELETON_ROWS}
				secondaryAction={
					<Button type="button" variant="outline" onClick={openCatalog} data-testid="browse-labels">
						<LayoutGrid />
						{browseLabel}
					</Button>
				}
				emptyAction={
					<Button type="button" size="sm" onClick={openCatalog}>
						<LayoutGrid />
						{browseLabel}
					</Button>
				}
			/>
			<LabelCatalogDialog
				open={isCatalogOpen}
				existingNames={existingNames}
				onClose={() => setIsCatalogOpen(false)}
				onAdd={addLabels}
			/>
		</>
	);
}

export function LabelsSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<LabelsSettingsSkeleton />}>
			<LabelsSettingsContent />
		</TeamSettingsGate>
	);
}
