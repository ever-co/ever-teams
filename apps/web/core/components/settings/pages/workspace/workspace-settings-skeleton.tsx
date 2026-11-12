'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton, SettingsSectionSkeleton } from '@/core/components/settings/kit/settings-page';

export function WorkspaceSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.workspaceGeneral.TITLE')}
			description={t('settings.entries.workspaceGeneral.DESCRIPTION')}
		>
			<SettingsSectionSkeleton title={t('settings.workspace.IDENTITY_SECTION')} rows={1} control="text" />
			<SettingsSectionSkeleton title={t('settings.workspace.FORMATS_SECTION')} rows={3} control="select" />
		</SettingsPageSkeleton>
	);
}
