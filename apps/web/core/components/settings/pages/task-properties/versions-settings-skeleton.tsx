'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton } from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const VERSIONS_SKELETON_ROWS = 4;

export function VersionsSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.versions.TITLE')}
			description={t('settings.entries.versions.DESCRIPTION')}
		>
			<PropertyListSkeleton rows={VERSIONS_SKELETON_ROWS} />
		</SettingsPageSkeleton>
	);
}
