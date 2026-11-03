'use client';

import { useTranslations } from 'next-intl';
import { SettingsPageSkeleton } from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const LABELS_SKELETON_ROWS = 5;

export function LabelsSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.labels.TITLE')}
			description={t('settings.entries.labels.DESCRIPTION')}
		>
			<PropertyListSkeleton rows={LABELS_SKELETON_ROWS} />
		</SettingsPageSkeleton>
	);
}
