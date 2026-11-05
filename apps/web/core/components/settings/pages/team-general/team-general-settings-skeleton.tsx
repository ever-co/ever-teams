'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import {
	SETTINGS_ROW,
	SETTINGS_SKELETON_BAR,
	SETTINGS_SURFACE,
	SettingsPageSkeleton,
	SettingsRowSkeleton,
	SettingsSectionSkeleton
} from '@/core/components/settings/kit/settings-page';

function TeamAvatarRowSkeleton() {
	return (
		<div className={SETTINGS_ROW} aria-hidden="true">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<span className="size-12 shrink-0 rounded-[12px] bg-foreground/[0.07]" />
				<div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5 w-24')} />
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-48')} />
				</div>
			</div>
			<span className="h-8 w-20 rounded-full hairline-ring ring-border" />
		</div>
	);
}

export function TeamGeneralSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.teamGeneral.TITLE')}
			description={t('settings.entries.teamGeneral.DESCRIPTION')}
		>
			<section className="flex flex-col gap-3" aria-busy="true">
				<h2 className="text-[15px] font-semibold text-foreground">{t('settings.teamGeneral.TEAM_SECTION')}</h2>
				<div className={SETTINGS_SURFACE}>
					<TeamAvatarRowSkeleton />
					<SettingsRowSkeleton labelWidth="w-24" control="text" />
					<SettingsRowSkeleton labelWidth="w-16" control="button" />
					<SettingsRowSkeleton labelWidth="w-14" control="button" />
					<SettingsRowSkeleton labelWidth="w-20" control="select" />
				</div>
			</section>
			<SettingsSectionSkeleton
				title={t('settings.teamGeneral.VISIBILITY_SECTION')}
				rows={2}
				control="none"
				leading
			/>
			<SettingsSectionSkeleton title={t('settings.teamGeneral.PROJECTS_SECTION')} rows={1} control="select" />
			<SettingsSectionSkeleton title={t('settings.teamGeneral.TRACKING_SECTION')} rows={3} control="switch" />
			<SettingsSectionSkeleton title={t('settings.teamGeneral.DANGER_SECTION')} rows={3} control="button" />
		</SettingsPageSkeleton>
	);
}
