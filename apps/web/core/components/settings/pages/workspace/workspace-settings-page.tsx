'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { useWorkspaceDataExport } from '@/core/hooks/settings/use-workspace-data-export';
import { useWorkspaceSettings } from '@/core/hooks/settings/use-workspace-settings';
import { useOrganizationBreaksSwitch } from '@/core/hooks/settings/use-organization-tracking-requirements';
import { WorkspaceBreaksSection } from './workspace-breaks-section';
import { WorkspaceDangerSection } from './workspace-danger-section';
import { WorkspaceDataSection } from './workspace-data-section';
import { WorkspaceFormatsSection } from './workspace-formats-section';
import { WorkspaceIdentitySection } from './workspace-identity-section';
import { WorkspaceRatesSection } from './workspace-rates-section';
import { WorkspaceSettingsSkeleton } from './workspace-settings-skeleton';

export function WorkspaceSettingsPage() {
	const t = useTranslations();
	const settings = useWorkspaceSettings();
	const { saveAllowBreaks } = useOrganizationBreaksSwitch();
	const dataExport = useWorkspaceDataExport({
		workspaceName: settings.name,
		organizationId: settings.organization?.id
	});
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
				saveWeekStart={settings.saveWeekStart}
				saveClock={settings.saveClock}
				saveCurrencyPosition={settings.saveCurrencyPosition}
				saveDurationRounding={settings.saveDurationRounding}
			/>
			<WorkspaceRatesSection
				key={`rates-${organization.id}`}
				organization={organization}
				canEdit={settings.canEdit}
				saveTimeLogsKeepTheirRates={settings.saveTimeLogsKeepTheirRates}
			/>
			<WorkspaceBreaksSection
				key={`breaks-${organization.id}`}
				organization={organization}
				canEdit={settings.canEdit}
				saveAllowBreaks={saveAllowBreaks}
			/>
			{dataExport.canExport && (
				<WorkspaceDataSection
					isExporting={dataExport.isExporting}
					isFailed={dataExport.isFailed}
					onExport={() => void dataExport.exportAll()}
				/>
			)}
			<WorkspaceDangerSection
				key={`danger-${organization.id}`}
				organization={{ id: organization.id, name: organization.name }}
			/>
		</SettingsPage>
	);
}
