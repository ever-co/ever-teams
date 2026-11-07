'use client';

import { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { EverPlatformSettings } from '@/core/components/optimized-components/settings';
import { SettingsPage, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { useAsanaIntegration } from '@/core/hooks/integrations/use-asana-integration';
import { useLinearIntegration } from '@/core/hooks/integrations/use-linear-integration';
import { useTrelloIntegration } from '@/core/hooks/integrations/use-trello-integration';
import { useGithubIntegrationSettings } from '@/core/hooks/settings/use-github-integration-settings';
import { canManageActiveTeamState } from '@/core/stores';
import { AsanaProviderSection } from './asana-provider';
import { GithubProviderSection } from './github-provider';
import { IntegrationsSettingsSkeleton } from './integrations-settings-skeleton';
import { LinearProviderSection } from './linear-provider';
import { TrelloProviderSection } from './trello-provider';

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
	const canManageTeam = useAtomValue(canManageActiveTeamState);
	const github = useGithubIntegrationSettings();
	const linear = useLinearIntegration();
	const asana = useAsanaIntegration();
	const trello = useTrelloIntegration();

	return (
		<SettingsPage
			title={t('settings.entries.integrations.TITLE')}
			description={t('settings.entries.integrations.DESCRIPTION')}
		>
			<GithubProviderSection github={github} />
			<LinearProviderSection linear={linear} />
			<AsanaProviderSection asana={asana} />
			<TrelloProviderSection trello={trello} />
			<EverPlatformSettings isTeamManager={canManageTeam} frame={frameEverPlatform} />
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
