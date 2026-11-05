'use client';

import { useTranslations } from 'next-intl';
import { useTeamGeneralSettings } from '@/core/hooks/settings/use-team-general-settings';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { TeamGeneralSettingsSkeleton } from './team-general-settings-skeleton';
import { TeamIdentitySection } from './team-identity-section';
import { TeamVisibilitySection } from './team-visibility-section';
import { TeamTrackingSection } from './team-tracking-section';
import { TeamDefaultProjectSection } from './team-default-project-section';
import { TeamDangerSection } from './team-danger-section';

function TeamGeneralContent() {
	const t = useTranslations();
	const settings = useTeamGeneralSettings();
	const team = settings.activeTeam;
	if (!team) {
		return <TeamGeneralSettingsSkeleton />;
	}
	const canEdit = settings.isTeamManager;

	return (
		<SettingsPage
			title={t('settings.entries.teamGeneral.TITLE')}
			description={t('settings.entries.teamGeneral.DESCRIPTION')}
		>
			<TeamIdentitySection
				key={`identity-${team.id}`}
				team={team}
				canEdit={canEdit}
				saveName={settings.saveName}
				saveColor={settings.saveColor}
				saveEmoji={settings.saveEmoji}
				saveSize={settings.saveSize}
				uploadAvatar={settings.uploadAvatar}
				removeAvatar={settings.removeAvatar}
			/>
			<TeamVisibilitySection
				key={`visibility-${team.id}`}
				team={team}
				canEdit={canEdit}
				saveVisibility={settings.saveVisibility}
			/>
			<TeamDefaultProjectSection
				key={`projects-${team.id}`}
				team={team}
				canEdit={canEdit}
				saveDefaultProject={settings.saveDefaultProject}
			/>
			<TeamTrackingSection
				key={`tracking-${team.id}`}
				team={team}
				canEdit={canEdit}
				ownTracking={settings.ownTracking}
				hasOwnMembership={settings.hasOwnMembership}
				setOwnTracking={settings.setOwnTracking}
				setShareProfileView={settings.setShareProfileView}
				setRequirePlanToTrack={settings.setRequirePlanToTrack}
			/>
			<TeamDangerSection key={`danger-${team.id}`} />
		</SettingsPage>
	);
}

export function TeamGeneralSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<TeamGeneralSettingsSkeleton />}>
			<TeamGeneralContent />
		</TeamSettingsGate>
	);
}
