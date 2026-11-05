'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton } from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const SIZES_SKELETON_ROWS = 5;

export function SizesSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.sizes.TITLE')}
			description={t('settings.entries.sizes.DESCRIPTION')}
		>
			<PropertyListSkeleton rows={SIZES_SKELETON_ROWS} />
		</SettingsPageSkeleton>
	);
}
