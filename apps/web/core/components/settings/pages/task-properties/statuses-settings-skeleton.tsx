'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton } from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const STATUSES_SKELETON_ROWS = 6;

export function StatusesSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.statuses.TITLE')}
			description={t('settings.entries.statuses.DESCRIPTION')}
		>
			<PropertyListSkeleton rows={STATUSES_SKELETON_ROWS} />
		</SettingsPageSkeleton>
	);
}
