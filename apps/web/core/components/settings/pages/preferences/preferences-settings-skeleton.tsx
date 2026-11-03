'use client';

import { useTranslations } from 'next-intl';
import {
	SETTINGS_SKELETON_BAR,
	SettingsPageSkeleton,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';

const TILE_KEYS = ['light', 'dark', 'system'];

function ThemeTilesSkeleton() {
	return (
		<div aria-hidden="true" className="grid grid-cols-3 gap-3 p-4">
			{TILE_KEYS.map((key) => (
				<span key={key} className="flex flex-col gap-2">
					<span className="aspect-[290/156] rounded-lg bg-foreground/[0.04] hairline-ring ring-border" />
					<span className={cn(SETTINGS_SKELETON_BAR, 'my-1 h-2.5 w-12')} />
				</span>
			))}
		</div>
	);
}

function PreferencesSectionsSkeleton() {
	const t = useTranslations();
	return (
		<>
			<SettingsSection
				title={t('settings.preferences.SECTION_THEME')}
				description={t('settings.preferences.SECTION_THEME_DESCRIPTION')}
			>
				<SettingsSurface>
					<ThemeTilesSkeleton />
				</SettingsSurface>
			</SettingsSection>
			<SettingsSection title={t('settings.preferences.SECTION_REGION')}>
				<SettingsSurface>
					<SettingsRowSkeleton labelWidth="w-20" control="select" />
					<SettingsRowSkeleton labelWidth="w-24" control="select" />
				</SettingsSurface>
			</SettingsSection>
			<SettingsSection title={t('settings.preferences.SECTION_SYNC')}>
				<SettingsSurface>
					<SettingsRowSkeleton labelWidth="w-20" control="switch" />
				</SettingsSurface>
			</SettingsSection>
		</>
	);
}

export function PreferencesSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.preferences.TITLE')}
			description={t('settings.entries.preferences.DESCRIPTION')}
		>
			<PreferencesSectionsSkeleton />
		</SettingsPageSkeleton>
	);
}
