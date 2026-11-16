'use client';

import { useTranslations } from 'next-intl';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import type { TOrganization } from '@/core/types/schemas';

interface WorkspacePrivateProjectsSectionProps {
	organization: TOrganization;
	canEdit: boolean;
	saveEnforcePrivateProjects: (enforces: boolean) => Promise<void>;
}

/**
 * Whether a project marked "Members and managers only" is listed only to its members and managers, and to the people
 * who may see every project (ever-gauzy#11465), off by default. Shown only by a Gauzy that has the setting: an older
 * one answers without it and would refuse to save it. Read only for the members who cannot edit the workspace.
 */
export function WorkspacePrivateProjectsSection({
	organization,
	canEdit,
	saveEnforcePrivateProjects
}: Readonly<WorkspacePrivateProjectsSectionProps>) {
	const t = useTranslations();
	const isStoredOn = organization.enforcePrivateProjects === true;
	const { value, isPending, change } = useOptimisticSetting<boolean>(isStoredOn, saveEnforcePrivateProjects);
	const hasSetting = 'enforcePrivateProjects' in organization;
	if (!hasSetting) {
		return null;
	}

	return (
		<SettingsSection id="workspace-private-projects" title={t('pages.projects.visibility.SETTING_SECTION')}>
			<SettingsSurface>
				<SwitchRow
					id="workspace-enforcePrivateProjects"
					label={t('pages.projects.visibility.SETTING_LABEL')}
					description={t('pages.projects.visibility.SETTING_DESCRIPTION')}
					checked={value}
					pending={isPending}
					disabled={!canEdit}
					onCheckedChange={(next) => {
						void change(next);
					}}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
