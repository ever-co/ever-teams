'use client';

import { useTranslations } from 'next-intl';
import { InlineTextRow } from '@/core/components/settings/kit/inline-text-row';
import { SettingsReadOnlyNote, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { isWorkspaceNameValid } from '@/core/lib/utils/settings-workspace';
import { MAX_WORKSPACE_NAME_LENGTH } from '@/core/lib/validation/workspace';

interface WorkspaceIdentitySectionProps {
	name: string;
	canRename: boolean;
	saveName: (name: string) => Promise<void>;
}

export function WorkspaceIdentitySection({ name, canRename, saveName }: Readonly<WorkspaceIdentitySectionProps>) {
	const t = useTranslations();

	const validateName = (value: string) => {
		if (isWorkspaceNameValid(value)) {
			return null;
		}
		return t('settings.workspace.NAME_INVALID', { max: MAX_WORKSPACE_NAME_LENGTH });
	};

	return (
		<SettingsSection id="workspace" title={t('settings.workspace.IDENTITY_SECTION')}>
			<SettingsSurface>
				<InlineTextRow
					label={t('settings.workspace.NAME_LABEL')}
					description={t('settings.workspace.NAME_DESCRIPTION')}
					value={name}
					maxLength={MAX_WORKSPACE_NAME_LENGTH}
					validate={validateName}
					onSave={saveName}
					readOnly={!canRename}
				/>
			</SettingsSurface>
			{!canRename && <SettingsReadOnlyNote>{t('settings.workspace.NAME_SUPER_ADMIN_ONLY')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
