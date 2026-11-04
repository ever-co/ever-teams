'use client';

import { useTranslations } from 'next-intl';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useVersionSettings } from '@/core/hooks/settings/use-version-settings';
import { VersionsSettingsSkeleton, VERSIONS_SKELETON_ROWS } from './versions-settings-skeleton';
import { TaskPropertySettingsBody } from './task-property-settings-body';

function VersionsSettingsContent() {
	const t = useTranslations();
	const model = useVersionSettings();
	return (
		<TaskPropertySettingsBody
			kind="version"
			title={t('settings.entries.versions.TITLE')}
			description={t('settings.entries.versions.DESCRIPTION')}
			model={model}
			skeletonRows={VERSIONS_SKELETON_ROWS}
		/>
	);
}

export function VersionsSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<VersionsSettingsSkeleton />}>
			<VersionsSettingsContent />
		</TeamSettingsGate>
	);
}
