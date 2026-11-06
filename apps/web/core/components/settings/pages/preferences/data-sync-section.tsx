'use client';

import { useId } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import { useDataSyncPreference } from '@/core/hooks/settings/use-data-sync-preference';
import { cn } from '@/core/lib/helpers';
import type { DataSyncMode } from '@/core/lib/utils/settings-data-sync';

const SEGMENT = 'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium';

const SEGMENT_PICKED =
	'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] hairline-ring ring-foreground/10 dark:bg-foreground/[0.09] dark:ring-foreground/15';

/** Pull is the only mode that works today, so Real time stays disabled. */
function SyncModeChoice({ mode }: Readonly<{ mode: DataSyncMode }>) {
	const t = useTranslations();
	const hintId = useId();
	const isPull = mode !== 'REAL_TIME';

	return (
		<fieldset className="flex flex-col gap-2" aria-describedby={hintId}>
			<legend className="mb-2 text-xs font-medium text-muted-foreground">
				{t('settings.preferences.SYNC_MODE')}
			</legend>
			<div className="inline-flex w-fit items-center gap-0.5 rounded-lg bg-foreground/[0.05] p-0.5">
				<label
					className={cn(
						SEGMENT,
						'cursor-pointer has-focus-visible:ring-[3px] has-focus-visible:ring-ring/25',
						isPull && SEGMENT_PICKED
					)}
				>
					<input type="radio" name={hintId} value="PULL" checked={isPull} readOnly className="sr-only" />
					{t('settings.preferences.SYNC_MODE_PULL')}
				</label>
				<label className={cn(SEGMENT, 'cursor-not-allowed text-muted-foreground/70')}>
					<input
						type="radio"
						name={hintId}
						value="REAL_TIME"
						checked={!isPull}
						disabled
						readOnly
						className="sr-only"
					/>
					{t('settings.preferences.SYNC_MODE_REAL_TIME')}
				</label>
			</div>
			<p id={hintId} className="text-xs text-pretty text-muted-foreground">
				{t('settings.preferences.SYNC_MODE_HINT')}
			</p>
		</fieldset>
	);
}

export function DataSyncSection() {
	const t = useTranslations();
	const { isDataSync, mode, changeDataSync } = useDataSyncPreference();

	const onChange = (isOn: boolean) => {
		const isSaved = changeDataSync(isOn);
		if (!isSaved) {
			const message = t('settings.preferences.SYNC_SAVE_FAILED');
			toast.error(message);
		}
	};

	return (
		<SettingsSection id="sync-zone" title={t('settings.preferences.SECTION_SYNC')}>
			<SettingsSurface>
				<SwitchRow
					id="settings-auto-sync"
					label={t('settings.preferences.AUTO_SYNC')}
					description={t('settings.preferences.AUTO_SYNC_DESCRIPTION')}
					checked={isDataSync}
					onCheckedChange={onChange}
					revealed={<SyncModeChoice mode={mode} />}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
