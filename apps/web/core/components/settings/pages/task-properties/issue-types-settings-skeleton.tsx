'use client';

import { useTranslations } from 'next-intl';
import {
	SettingsPageSkeleton,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { PropertyListSkeleton } from './property-list-skeleton';

export const ISSUE_TYPES_SKELETON_ROWS = 4;

export function IssueTypeDefaultRowSkeleton() {
	return (
		<SettingsSurface>
			<SettingsRowSkeleton control="select" />
		</SettingsSurface>
	);
}

export function IssueTypesSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.issueTypes.TITLE')}
			description={t('settings.entries.issueTypes.DESCRIPTION')}
		>
			<SettingsSection title={t('settings.taskProperties.issueTypes.DEFAULT_SECTION')}>
				<IssueTypeDefaultRowSkeleton />
			</SettingsSection>
			<SettingsSection title={t('settings.taskProperties.issueTypes.TYPES_SECTION')}>
				<PropertyListSkeleton rows={ISSUE_TYPES_SKELETON_ROWS} />
			</SettingsSection>
		</SettingsPageSkeleton>
	);
}
