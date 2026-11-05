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

/** The organization's tracking requirements, which only its admins see and change. */
export function OrganizationTrackingSection() {
	const t = useTranslations();
	const { organization, saveRequirement } = useOrganizationTrackingRequirements();
	const title = t('settings.teamGeneral.ORGANIZATION_TRACKING_SECTION');
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
				{TRACKING_REQUIREMENTS.map((requirement) => (
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
