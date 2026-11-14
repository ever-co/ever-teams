'use client';

import { useTranslations } from 'next-intl';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import type { TOrganization } from '@/core/types/schemas';

interface WorkspaceRatesSectionProps {
	organization: TOrganization;
	canEdit: boolean;
	saveTimeLogsKeepTheirRates: (timeLogsKeepTheirRates: boolean) => Promise<void>;
}

function KeepRatesSwitch({
	isStoredOn,
	onSave
}: Readonly<{ isStoredOn: boolean; onSave: (isOn: boolean) => Promise<void> }>) {
	const t = useTranslations();
	const { value, isPending, change } = useOptimisticSetting<boolean>(isStoredOn, onSave);

	return (
		<SwitchRow
			id="workspace-timeLogsKeepTheirRates"
			label={t('settings.workspace.KEEP_RATES_LABEL')}
			description={t('settings.workspace.KEEP_RATES_DESCRIPTION')}
			checked={value}
			pending={isPending}
			onCheckedChange={(next) => {
				void change(next);
			}}
		/>
	);
}

function KeepRatesValue({ isStoredOn }: Readonly<{ isStoredOn: boolean }>) {
	const t = useTranslations();
	let valueKey: 'settings.workspace.KEEP_RATES_ON' | 'settings.workspace.KEEP_RATES_OFF' =
		'settings.workspace.KEEP_RATES_OFF';
	if (isStoredOn) {
		valueKey = 'settings.workspace.KEEP_RATES_ON';
	}
	return (
		<SettingsRow
			label={t('settings.workspace.KEEP_RATES_LABEL')}
			description={t('settings.workspace.KEEP_RATES_DESCRIPTION')}
		>
			<span className="text-[13px] text-foreground">{t(valueKey)}</span>
		</SettingsRow>
	);
}

/**
 * Whether a rate change without a day prices only the time tracked from then on (`timeLogsKeepTheirRates`, #5212).
 * Shown only by a Gauzy that stores rates on time entries: an older one answers without the setting and would not
 * save it.
 */
export function WorkspaceRatesSection({
	organization,
	canEdit,
	saveTimeLogsKeepTheirRates
}: Readonly<WorkspaceRatesSectionProps>) {
	const t = useTranslations();
	const hasSetting = 'timeLogsKeepTheirRates' in organization;
	if (!hasSetting) {
		return null;
	}
	const isStoredOn = organization.timeLogsKeepTheirRates === true;

	return (
		<SettingsSection
			id="rates"
			title={t('settings.workspace.RATES_SECTION')}
			description={t('settings.workspace.RATES_DESCRIPTION')}
		>
			<SettingsSurface>
				{canEdit && <KeepRatesSwitch isStoredOn={isStoredOn} onSave={saveTimeLogsKeepTheirRates} />}
				{!canEdit && <KeepRatesValue isStoredOn={isStoredOn} />}
			</SettingsSurface>
			{!canEdit && <SettingsReadOnlyNote>{t('settings.workspace.READ_ONLY_NOTE')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
