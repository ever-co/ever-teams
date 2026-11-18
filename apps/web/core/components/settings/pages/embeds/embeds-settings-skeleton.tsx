'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton, SettingsSectionSkeleton } from '@/core/components/settings/kit/settings-page';

/** The embeds page while its route loads: the allowed sites and the credentials. */
export function EmbedsSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.embeds.TITLE')}
			description={t('settings.embeds.PAGE_DESCRIPTION')}
		>
			<SettingsSectionSkeleton title={t('settings.embeds.SECTION_ORIGINS')} rows={2} control="button" leading />
			<SettingsSectionSkeleton
				title={t('settings.embeds.SECTION_CREDENTIALS')}
				rows={2}
				control="button"
				leading
			/>
		</SettingsPageSkeleton>
	);
}
