'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton } from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const PRIORITIES_SKELETON_ROWS = 4;

export function PrioritiesSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.priorities.TITLE')}
			description={t('settings.entries.priorities.DESCRIPTION')}
		>
			<PropertyListSkeleton rows={PRIORITIES_SKELETON_ROWS} />
		</SettingsPageSkeleton>
	);
}
