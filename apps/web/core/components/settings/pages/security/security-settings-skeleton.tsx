'use client';

import { useTranslations } from 'next-intl';
import {
	SettingsPageSkeleton,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';

export function SecuritySettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.security.TITLE')}
			description={t('settings.entries.security.DESCRIPTION')}
		>
			<SettingsSection
				title={t('settings.security.SECTION_TITLE')}
				description={t('settings.security.SECTION_DESCRIPTION')}
			>
				<SettingsSurface>
					<SettingsRowSkeleton leading withDescription control="button" />
				</SettingsSurface>
			</SettingsSection>
		</SettingsPageSkeleton>
	);
}
