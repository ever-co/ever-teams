'use client';

import { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { EverPlatformSettings } from '@/core/components/optimized-components/settings';
import { SettingsPage, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useGithubIntegrationSettings } from '@/core/hooks/settings/use-github-integration-settings';
import { isTeamManagerState } from '@/core/stores';
import { GithubProviderSection } from './github-provider';
import { IntegrationsSettingsSkeleton } from './integrations-settings-skeleton';

function EverPlatformFrame({ children }: Readonly<{ children: ReactNode }>) {
	const t = useTranslations();
	return (
		<SettingsSection
			id="ever-platform"
			title={t('pages.settingsTeam.everPlatform.TITLE')}
			description={t('pages.settingsTeam.everPlatform.DESCRIPTION')}
		>
			{children}
		</SettingsSection>
	);
}

function frameEverPlatform(content: ReactNode) {
	return <EverPlatformFrame>{content}</EverPlatformFrame>;
}

function IntegrationsSettingsContent() {
	const t = useTranslations();
	const isTeamManager = useAtomValue(isTeamManagerState);
	const github = useGithubIntegrationSettings();

	return (
		<SettingsPage
			title={t('settings.entries.integrations.TITLE')}
			description={t('settings.entries.integrations.DESCRIPTION')}
		>
			<GithubProviderSection github={github} />
			<EverPlatformSettings isTeamManager={isTeamManager} frame={frameEverPlatform} />
		</SettingsPage>
	);
}

export function IntegrationsSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<IntegrationsSettingsSkeleton />} requiresManager>
			<IntegrationsSettingsContent />
		</TeamSettingsGate>
	);
}
