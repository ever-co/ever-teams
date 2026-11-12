'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton, SettingsSectionSkeleton } from '@/core/components/settings/kit/settings-page';

export function TimeImportSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.import.TITLE')}
			description={t('settings.entries.import.DESCRIPTION')}
		>
			<SettingsSectionSkeleton title={t('timeImport.SECTION_TITLE')} rows={2} control="button" leading />
			<SettingsSectionSkeleton title={t('timeImport.COLUMNS_TITLE')} rows={4} control="none" />
		</SettingsPageSkeleton>
	);
}
