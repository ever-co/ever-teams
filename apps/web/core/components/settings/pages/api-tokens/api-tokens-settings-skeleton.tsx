'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton, SettingsSectionSkeleton } from '@/core/components/settings/kit/settings-page';

/** The API tokens page while its route loads: the tokens and the note on scripts. */
export function ApiTokensSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.apiTokens.TITLE')}
			description={t('settings.apiTokens.PAGE_DESCRIPTION')}
		>
			<SettingsSectionSkeleton title={t('settings.apiTokens.SECTION_TOKENS')} rows={2} control="button" leading />
			<SettingsSectionSkeleton title={t('settings.apiTokens.USAGE_TITLE')} rows={1} control="none" />
		</SettingsPageSkeleton>
	);
}
