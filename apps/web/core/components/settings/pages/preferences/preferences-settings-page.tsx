'use client';

import { useTranslations } from 'next-intl';
import { SettingsPage, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { HAS_EVER_APP_SWITCHER } from '@/core/constants/config/ever-apps';
import { useFillMissingTimeZone } from '@/core/hooks/settings/use-time-zone-setting';
import { AppSwitcherTiles } from './app-switcher-tiles';
import { DataSyncSection } from './data-sync-section';
import { LanguageRow } from './language-row';
import { ThemeTiles } from './theme-tiles';
import { TimeZoneRow } from './time-zone-row';

export function PreferencesSettingsPage() {
	const t = useTranslations();
	useFillMissingTimeZone();

	return (
		<SettingsPage
			title={t('settings.entries.preferences.TITLE')}
			description={t('settings.entries.preferences.DESCRIPTION')}
		>
			<SettingsSection
				title={t('settings.preferences.SECTION_THEME')}
				description={t('settings.preferences.SECTION_THEME_DESCRIPTION')}
			>
				<SettingsSurface>
					<ThemeTiles />
				</SettingsSurface>
			</SettingsSection>
			{HAS_EVER_APP_SWITCHER && (
				<SettingsSection
					title={t('settings.preferences.SECTION_APP_SWITCHER')}
					description={t('settings.preferences.SECTION_APP_SWITCHER_DESCRIPTION')}
				>
					<SettingsSurface>
						<AppSwitcherTiles />
					</SettingsSurface>
				</SettingsSection>
			)}
			<SettingsSection title={t('settings.preferences.SECTION_REGION')}>
				<SettingsSurface>
					<LanguageRow />
					<TimeZoneRow />
				</SettingsSurface>
			</SettingsSection>
			<DataSyncSection />
		</SettingsPage>
	);
}
