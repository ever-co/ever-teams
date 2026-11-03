'use client';

import { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { stripLocalePrefix } from '@/core/lib/utils/navigation-path';
import { activeSettingsEntry, SettingsEntryId } from './kit/settings-entries';
import { SettingsIndexSkeleton } from './pages/index/settings-index-skeleton';
import { ProfileSettingsSkeleton } from './pages/profile/profile-settings-skeleton';
import { PreferencesSettingsSkeleton } from './pages/preferences/preferences-settings-skeleton';
import { WorkingHoursSettingsSkeleton } from './pages/working-hours/working-hours-settings-skeleton';
import { NotificationsSettingsSkeleton } from './pages/notifications/notifications-settings-skeleton';
import { TeamGeneralSettingsSkeleton } from './pages/team-general/team-general-settings-skeleton';
import { MembersSettingsSkeleton } from './pages/members/members-settings-skeleton';
import { IntegrationsSettingsSkeleton } from './pages/integrations/integrations-settings-skeleton';
import { PermissionsContentSkeleton } from '@/core/components/pages/permissions/permissions-page-skeleton';
import { StatusesSettingsSkeleton } from './pages/task-properties/statuses-settings-skeleton';
import { PrioritiesSettingsSkeleton } from './pages/task-properties/priorities-settings-skeleton';
import { SizesSettingsSkeleton } from './pages/task-properties/sizes-settings-skeleton';
import { LabelsSettingsSkeleton } from './pages/task-properties/labels-settings-skeleton';
import { IssueTypesSettingsSkeleton } from './pages/task-properties/issue-types-settings-skeleton';
import { VersionsSettingsSkeleton } from './pages/task-properties/versions-settings-skeleton';

const PAGE_SKELETONS: Readonly<Record<SettingsEntryId, ComponentType>> = {
	profile: ProfileSettingsSkeleton,
	preferences: PreferencesSettingsSkeleton,
	workingHours: WorkingHoursSettingsSkeleton,
	notifications: NotificationsSettingsSkeleton,
	teamGeneral: TeamGeneralSettingsSkeleton,
	members: MembersSettingsSkeleton,
	integrations: IntegrationsSettingsSkeleton,
	permissions: PermissionsContentSkeleton,
	statuses: StatusesSettingsSkeleton,
	priorities: PrioritiesSettingsSkeleton,
	sizes: SizesSettingsSkeleton,
	labels: LabelsSettingsSkeleton,
	issueTypes: IssueTypesSettingsSkeleton,
	versions: VersionsSettingsSkeleton
};

export function SettingsContentSkeleton() {
	const pathname = usePathname();
	const entry = activeSettingsEntry(stripLocalePrefix(pathname ?? ''));
	if (!entry) {
		return <SettingsIndexSkeleton />;
	}
	const PageSkeleton = PAGE_SKELETONS[entry.id];
	return <PageSkeleton />;
}

export function SettingsRouteSkeleton() {
	return (
		<PageSkeletonFrame>
			<SettingsContentSkeleton />
		</PageSkeletonFrame>
	);
}
