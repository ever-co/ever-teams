'use client';

import { useTranslations } from 'next-intl';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { useOrganizationTrackingSwitchRule } from '@/core/hooks/settings/use-organization-tracking-requirements';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import type { TOrganization } from '@/core/types/schemas';

interface RestrictionRowProps {
	organization: TOrganization;
	saveRestriction: (restricts: boolean) => Promise<void>;
}

function RestrictionRow({ organization, saveRestriction }: Readonly<RestrictionRowProps>) {
	const t = useTranslations();
	const isStoredOn = organization.restrictTrackingSwitchToHigherRoles === true;
	const { value, isPending, change } = useOptimisticSetting<boolean>(isStoredOn, saveRestriction);

	return (
		<SwitchRow
			id="organization-restrictTrackingSwitchToHigherRoles"
			label={t('settings.teamGeneral.RESTRICT_TRACKING_SWITCH_LABEL')}
			description={t('settings.teamGeneral.RESTRICT_TRACKING_SWITCH_DESCRIPTION')}
			checked={value}
			pending={isPending}
			onCheckedChange={(next) => {
				void change(next);
			}}
		/>
	);
}

/**
 * Who turns the organization's members' time tracking on or off (#5015), which only its admins see and change. Shown
 * once the organization is read, and only by a Gauzy that has the setting: an older one answers without it and refuses
 * to save it. The time entry requirements section above already tells a failed read.
 */
export function OrganizationTrackingSwitchSection() {
	const t = useTranslations();
	const { organization, saveRestriction } = useOrganizationTrackingSwitchRule();
	if (!organization || !('restrictTrackingSwitchToHigherRoles' in organization)) {
		return null;
	}

	return (
		<SettingsSection
			id="organization-tracking-switch"
			title={t('settings.teamGeneral.TRACKING_SWITCH_SECTION')}
			description={t('settings.teamGeneral.ORGANIZATION_TRACKING_DESCRIPTION', {
				organization: organization.name
			})}
		>
			<SettingsSurface>
				<RestrictionRow organization={organization} saveRestriction={saveRestriction} />
			</SettingsSurface>
		</SettingsSection>
	);
}
