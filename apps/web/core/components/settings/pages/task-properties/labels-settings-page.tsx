'use client';

import { useTranslations } from 'next-intl';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useLabelSettings } from '@/core/hooks/settings/use-label-settings';
import { LabelsSettingsSkeleton, LABELS_SKELETON_ROWS } from './labels-settings-skeleton';
import { TaskPropertySettingsBody } from './task-property-settings-body';

function LabelsSettingsContent() {
	const t = useTranslations();
	const model = useLabelSettings();
	return (
		<TaskPropertySettingsBody
			kind="label"
			title={t('settings.entries.labels.TITLE')}
			description={t('settings.entries.labels.DESCRIPTION')}
			model={model}
			skeletonRows={LABELS_SKELETON_ROWS}
		/>
	);
}

export function LabelsSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<LabelsSettingsSkeleton />}>
			<LabelsSettingsContent />
		</TeamSettingsGate>
	);
}
