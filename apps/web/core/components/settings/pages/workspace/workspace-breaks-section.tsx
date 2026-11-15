'use client';

import { useTranslations } from 'next-intl';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import type { TOrganization } from '@/core/types/schemas';

interface WorkspaceBreaksSectionProps {
	organization: TOrganization;
	canEdit: boolean;
	saveAllowBreaks: (allows: boolean) => Promise<void>;
}

/**
 * Whether members take breaks from the timer and add them by hand (Gauzy #11940), off by default. Shown only by a
 * Gauzy that has the setting: an older one answers without it and would refuse to save it. Read only for the members
 * who cannot edit the workspace.
 */
export function WorkspaceBreaksSection({
	organization,
	canEdit,
	saveAllowBreaks
}: Readonly<WorkspaceBreaksSectionProps>) {
	const t = useTranslations();
	const isStoredOn = organization.allowBreaks === true;
	const { value, isPending, change } = useOptimisticSetting<boolean>(isStoredOn, saveAllowBreaks);
	const hasSetting = 'allowBreaks' in organization;
	if (!hasSetting) {
		return null;
	}

	return (
		<SettingsSection id="workspace-breaks" title={t('breaks.SETTINGS_SECTION')}>
			<SettingsSurface>
				<SwitchRow
					id="workspace-allowBreaks"
					label={t('breaks.SETTINGS_LABEL')}
					description={t('breaks.SETTINGS_DESCRIPTION')}
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
