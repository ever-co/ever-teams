'use client';

import { useTranslations } from 'next-intl';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useSizeSettings } from '@/core/hooks/settings/use-size-settings';
import { SizesSettingsSkeleton, SIZES_SKELETON_ROWS } from './sizes-settings-skeleton';
import { TaskPropertySettingsBody } from './task-property-settings-body';

function SizesSettingsContent() {
	const t = useTranslations();
	const model = useSizeSettings();
	return (
		<TaskPropertySettingsBody
			kind="size"
			title={t('settings.entries.sizes.TITLE')}
			description={t('settings.entries.sizes.DESCRIPTION')}
			model={model}
			skeletonRows={SIZES_SKELETON_ROWS}
		/>
	);
}

export function SizesSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<SizesSettingsSkeleton />}>
			<SizesSettingsContent />
		</TeamSettingsGate>
	);
}
