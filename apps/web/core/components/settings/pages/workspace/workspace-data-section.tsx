'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, Spinner } from '@/core/components/icons';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';

interface WorkspaceDataSectionProps {
	isExporting: boolean;
	isFailed: boolean;
	onExport: () => void;
}

/** The workspace's data as a whole: the export of every table, for the workspace owner. */
export function WorkspaceDataSection({ isExporting, isFailed, onExport }: Readonly<WorkspaceDataSectionProps>) {
	const t = useTranslations();
	let actionIcon = <Download />;
	let actionLabel = t('settings.workspace.EXPORT_ACTION');
	if (isExporting) {
		actionIcon = <Spinner className="size-3.5 animate-spin" />;
		actionLabel = t('settings.workspace.EXPORTING');
	}
	const showsFailure = isFailed && !isExporting;

	return (
		<SettingsSection id="data" title={t('settings.workspace.DATA_SECTION')}>
			<SettingsSurface>
				<SettingsRow
					label={t('settings.workspace.EXPORT_LABEL')}
					description={t('settings.workspace.EXPORT_DESCRIPTION')}
				>
					<Button
						type="button"
						variant="outline"
						onClick={onExport}
						disabled={isExporting}
						aria-busy={isExporting || undefined}
						data-testid="workspace-export-all"
					>
						{actionIcon}
						{actionLabel}
					</Button>
				</SettingsRow>
			</SettingsSurface>
			{showsFailure && (
				<Notice
					tone="error"
					title={t('settings.workspace.EXPORT_FAILED')}
					description={t('settings.workspace.EXPORT_FAILED_DESCRIPTION')}
					actions={
						<Button type="button" variant="outline" onClick={onExport}>
							{t('notifications.RETRY')}
						</Button>
					}
				/>
			)}
		</SettingsSection>
	);
}
