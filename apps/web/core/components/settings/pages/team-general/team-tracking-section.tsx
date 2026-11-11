'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import type { TOrganizationTeam } from '@/core/types/schemas';

interface OptimisticSwitchRowProps {
	id: string;
	label: string;
	description: ReactNode;
	stored: boolean;
	save: (enabled: boolean) => Promise<void>;
}

function OptimisticSwitchRow({ id, label, description, stored, save }: Readonly<OptimisticSwitchRowProps>) {
	const { value, isPending, change } = useOptimisticSetting<boolean>(stored, save);
	return (
		<SwitchRow
			id={id}
			label={label}
			description={description}
			checked={value}
			pending={isPending}
			onCheckedChange={(next) => {
				void change(next);
			}}
		/>
	);
}

function StateText({ isOn }: Readonly<{ isOn: boolean }>) {
	const t = useTranslations();
	if (isOn) {
		return <span className="text-[13px] text-foreground">{t('settings.teamGeneral.ON')}</span>;
	}
	return <span className="text-[13px] text-muted-foreground">{t('settings.teamGeneral.OFF')}</span>;
}

interface TeamTrackingSectionProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	ownTracking: boolean;
	/** The user has a row in the team and may switch their own tracking there: only an admin may. */
	canTurnOwnTracking: boolean;
	setOwnTracking: (enabled: boolean) => Promise<void>;
	setShareProfileView: (enabled: boolean) => Promise<void>;
	setRequirePlanToTrack: (enabled: boolean) => Promise<void>;
}

export function TeamTrackingSection({
	team,
	canEdit,
	ownTracking,
	canTurnOwnTracking,
	setOwnTracking,
	setShareProfileView,
	setRequirePlanToTrack
}: Readonly<TeamTrackingSectionProps>) {
	const t = useTranslations();
	const sharesProfiles = Boolean(team.shareProfileView);
	const requiresPlan = Boolean(team.requirePlanToTrack);
	const showsOwnTracking = canEdit && canTurnOwnTracking;

	if (!canEdit) {
		return (
			<SettingsSection id="tracking" title={t('settings.teamGeneral.TRACKING_SECTION')}>
				<SettingsSurface>
					<SettingsRow
						label={t('settings.teamGeneral.SHARE_PROFILES_LABEL')}
						description={t('settings.teamGeneral.SHARE_PROFILES_DESCRIPTION')}
					>
						<StateText isOn={sharesProfiles} />
					</SettingsRow>
					<SettingsRow
						label={t('settings.teamGeneral.REQUIRE_PLAN_LABEL')}
						description={t('settings.teamGeneral.REQUIRE_PLAN_DESCRIPTION')}
					>
						<StateText isOn={requiresPlan} />
					</SettingsRow>
				</SettingsSurface>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection id="tracking" title={t('settings.teamGeneral.TRACKING_SECTION')}>
			<SettingsSurface>
				{showsOwnTracking && (
					<OptimisticSwitchRow
						id="team-own-time-tracking"
						label={t('settings.teamGeneral.OWN_TRACKING_LABEL')}
						description={t('settings.teamGeneral.OWN_TRACKING_DESCRIPTION')}
						stored={ownTracking}
						save={setOwnTracking}
					/>
				)}
				<OptimisticSwitchRow
					id="team-share-profile-views"
					label={t('settings.teamGeneral.SHARE_PROFILES_LABEL')}
					description={t('settings.teamGeneral.SHARE_PROFILES_DESCRIPTION')}
					stored={sharesProfiles}
					save={setShareProfileView}
				/>
				<OptimisticSwitchRow
					id="team-require-daily-plan"
					label={t('settings.teamGeneral.REQUIRE_PLAN_LABEL')}
					description={t('settings.teamGeneral.REQUIRE_PLAN_DESCRIPTION')}
					stored={requiresPlan}
					save={setRequirePlanToTrack}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
