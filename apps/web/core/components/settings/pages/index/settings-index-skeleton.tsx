'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton, SettingsSectionSkeleton } from '@/core/components/settings/kit/settings-page';

export function SettingsIndexSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton title={t('common.SETTINGS')} description={t('settings.index.DESCRIPTION')}>
			<SettingsSectionSkeleton title={t('settings.groups.account')} rows={4} control="none" leading />
			<SettingsSectionSkeleton title={t('settings.groups.team')} rows={3} control="none" leading />
		</SettingsPageSkeleton>
	);
}
