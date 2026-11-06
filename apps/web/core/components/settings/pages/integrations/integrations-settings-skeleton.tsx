'use client';

import { useTranslations } from 'next-intl';
import { IconsGithubFilled } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	SETTINGS_ROW_LABEL,
	SETTINGS_SKELETON_BAR,
	SettingsPageSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';

export const PROVIDER_TILE =
	'flex size-8 shrink-0 items-center justify-center rounded-[9px] keycap-3d text-foreground [&_svg]:size-4.5';

export const PROVIDER_ROW = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left';

export function GithubTile() {
	return (
		<span aria-hidden="true" className={PROVIDER_TILE}>
			<IconsGithubFilled />
		</span>
	);
}

export function GithubProviderRowSkeleton() {
	const t = useTranslations();
	return (
		<div className={PROVIDER_ROW} aria-busy="true">
			<GithubTile />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className={SETTINGS_ROW_LABEL}>{t('pages.settingsTeam.GITHUB')}</span>
				<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-3/5')} />
			</div>
			<span aria-hidden="true" className="h-8 w-20 shrink-0 rounded-full hairline-ring ring-border" />
		</div>
	);
}

function IntegrationsAppsSectionSkeleton() {
	const t = useTranslations();
	return (
		<SettingsSection
			title={t('settings.integrations.APPS_TITLE')}
			description={t('settings.integrations.APPS_DESCRIPTION')}
		>
			<SettingsSurface>
				<GithubProviderRowSkeleton />
			</SettingsSurface>
		</SettingsSection>
	);
}

/** The Ever Platform section is left out: whether it shows depends on the paired API's answer. */
export function IntegrationsSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.integrations.TITLE')}
			description={t('settings.entries.integrations.DESCRIPTION')}
		>
			<IntegrationsAppsSectionSkeleton />
		</SettingsPageSkeleton>
	);
}
