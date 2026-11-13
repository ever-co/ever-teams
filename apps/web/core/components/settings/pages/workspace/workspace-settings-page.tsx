'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { useWorkspaceSettings } from '@/core/hooks/settings/use-workspace-settings';
import { WorkspaceFormatsSection } from './workspace-formats-section';
import { WorkspaceIdentitySection } from './workspace-identity-section';
import { WorkspaceSettingsSkeleton } from './workspace-settings-skeleton';

export function WorkspaceSettingsPage() {
	const t = useTranslations();
	const settings = useWorkspaceSettings();
	const title = t('settings.entries.workspaceGeneral.TITLE');
	const description = t('settings.entries.workspaceGeneral.DESCRIPTION');

	if (settings.isLoadFailed) {
		return (
			<SettingsPage title={title} description={description}>
				<Notice
					tone="error"
					title={t('settings.workspace.LOAD_FAILED')}
					actions={
						<Button type="button" variant="outline" onClick={settings.retryLoad}>
							{t('notifications.RETRY')}
						</Button>
					}
				/>
			</SettingsPage>
		);
	}
	const organization = settings.organization;
	if (settings.isLoading || !organization) {
		return <WorkspaceSettingsSkeleton />;
	}

	return (
		<SettingsPage title={title} description={description}>
			<WorkspaceIdentitySection
				key={`identity-${organization.id}`}
				name={settings.name}
				canRename={settings.canRename}
				saveName={settings.saveName}
			/>
			<WorkspaceFormatsSection
				key={`formats-${organization.id}`}
				organization={organization}
				canEdit={settings.canEdit}
				saveCurrency={settings.saveCurrency}
				saveDateFormat={settings.saveDateFormat}
				saveNumberFormat={settings.saveNumberFormat}
			/>
		</SettingsPage>
	);
}
