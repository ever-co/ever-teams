'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import {
	TRACKING_REQUIREMENTS,
	useOrganizationTrackingRequirements,
	type TTrackingRequirement
} from '@/core/hooks/settings/use-organization-tracking-requirements';
import {
	SettingsSection,
	SettingsSectionSkeleton,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import { Button } from '@/core/components/duplicated-components/_button';
import type { TOrganization } from '@/core/types/schemas';

const REQUIREMENT_TEXT = {
	requireTeam: {
		label: 'settings.teamGeneral.REQUIRE_TEAM_LABEL',
		description: 'settings.teamGeneral.REQUIRE_TEAM_DESCRIPTION'
	},
	requireProject: {
		label: 'settings.teamGeneral.REQUIRE_PROJECT_LABEL',
		description: 'settings.teamGeneral.REQUIRE_PROJECT_DESCRIPTION'
	},
	requireTask: {
		label: 'settings.teamGeneral.REQUIRE_TASK_LABEL',
		description: 'settings.teamGeneral.REQUIRE_TASK_DESCRIPTION'
	},
	requireClient: {
		label: 'settings.teamGeneral.REQUIRE_CLIENT_LABEL',
		description: 'settings.teamGeneral.REQUIRE_CLIENT_DESCRIPTION'
	},
	requireDescription: {
		label: 'settings.teamGeneral.REQUIRE_DESCRIPTION_LABEL',
		description: 'settings.teamGeneral.REQUIRE_DESCRIPTION_DESCRIPTION'
	}
} as const;

interface RequirementRowProps {
	requirement: TTrackingRequirement;
	organization: TOrganization;
	saveRequirement: (requirement: TTrackingRequirement, isRequired: boolean) => Promise<void>;
}

function RequirementRow({ requirement, organization, saveRequirement }: Readonly<RequirementRowProps>) {
	const t = useTranslations();
	const text = REQUIREMENT_TEXT[requirement];
	const isStoredRequired = organization[requirement] === true;
	const save = useCallback(
		(isRequired: boolean) => saveRequirement(requirement, isRequired),
		[requirement, saveRequirement]
	);
	const { value, isPending, change } = useOptimisticSetting<boolean>(isStoredRequired, save);

	return (
		<SwitchRow
			id={`organization-${requirement}`}
			label={t(text.label)}
			description={t(text.description)}
			checked={value}
			pending={isPending}
			onCheckedChange={(next) => {
				void change(next);
			}}
		/>
	);
}

// A Gauzy that predates a switch answers the organization without it, and refuses to save it
function requirementsServedBy(organization: TOrganization): TTrackingRequirement[] {
	return TRACKING_REQUIREMENTS.filter((requirement) => requirement in organization);
}

/** The organization's tracking requirements, which only its admins see and change. */
export function OrganizationTrackingSection() {
	const t = useTranslations();
	const { organization, saveRequirement, isLoadFailed, retryLoad } = useOrganizationTrackingRequirements();
	const title = t('settings.teamGeneral.ORGANIZATION_TRACKING_SECTION');
	const showsLoadFailure = !organization && isLoadFailed;
	if (showsLoadFailure) {
		return (
			<SettingsSection id="organization-tracking" title={title}>
				<p role="alert" className="flex items-center gap-2 text-xs text-destructive-ink">
					{t('settings.teamGeneral.REQUIREMENTS_LOAD_FAILED')}
					<Button type="button" variant="outline" size="sm" onClick={retryLoad}>
						{t('notifications.RETRY')}
					</Button>
				</p>
			</SettingsSection>
		);
	}
	if (!organization) {
		return <SettingsSectionSkeleton title={title} rows={TRACKING_REQUIREMENTS.length} />;
	}

	return (
		<SettingsSection
			id="organization-tracking"
			title={title}
			description={t('settings.teamGeneral.ORGANIZATION_TRACKING_DESCRIPTION', {
				organization: organization.name
			})}
		>
			<SettingsSurface>
				{requirementsServedBy(organization).map((requirement) => (
					<RequirementRow
						key={requirement}
						requirement={requirement}
						organization={organization}
						saveRequirement={saveRequirement}
					/>
				))}
			</SettingsSurface>
		</SettingsSection>
	);
}
