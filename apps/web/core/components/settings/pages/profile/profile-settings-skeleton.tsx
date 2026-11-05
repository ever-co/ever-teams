'use client';

import { useTranslations } from 'next-intl';
import {
	SETTINGS_ROW,
	SETTINGS_SKELETON_BAR,
	SettingsPageSkeleton,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';

function PhotoRowSkeleton() {
	return (
		<div className={SETTINGS_ROW} aria-hidden="true">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<span className="size-12 shrink-0 rounded-full bg-foreground/[0.07]" />
				<div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5 w-14')} />
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-3/5')} />
				</div>
			</div>
			<span className="h-8 w-20 rounded-full hairline-ring ring-border" />
		</div>
	);
}

export function ProfileSectionsSkeleton() {
	const t = useTranslations();
	return (
		<>
			<SettingsSection title={t('settings.profile.SECTION_PROFILE')}>
				<SettingsSurface>
					<PhotoRowSkeleton />
					<SettingsRowSkeleton labelWidth="w-20" withDescription={false} control="text" />
					<SettingsRowSkeleton labelWidth="w-20" withDescription={false} control="text" />
					<SettingsRowSkeleton labelWidth="w-12" control="text" />
					<SettingsRowSkeleton labelWidth="w-14" withDescription={false} control="text" />
				</SettingsSurface>
			</SettingsSection>
			<SettingsSection
				tone="danger"
				title={t('settings.profile.SECTION_ACCOUNT')}
				description={t('settings.profile.SECTION_ACCOUNT_DESCRIPTION')}
			>
				<SettingsSurface>
					<SettingsRowSkeleton labelWidth="w-24" control="button" />
					<SettingsRowSkeleton labelWidth="w-28" control="button" />
					<SettingsRowSkeleton labelWidth="w-36" control="button" />
					<SettingsRowSkeleton labelWidth="w-32" control="button" />
				</SettingsSurface>
			</SettingsSection>
		</>
	);
}

export function ProfileSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.profile.TITLE')}
			description={t('settings.entries.profile.DESCRIPTION')}
		>
			<ProfileSectionsSkeleton />
		</SettingsPageSkeleton>
	);
}
