'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileImport } from '@/core/components/icons';
import { TIME_IMPORT_SETTINGS_PATH } from '@/core/components/settings/kit/settings-entries';
import {
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { PROVIDER_ROW, PROVIDER_TILE } from './integrations-settings-skeleton';

/**
 * The way into the imports from the Integrations page. The import itself is its own settings page, because this
 * page is for team managers and any member who may add manual time may import their own.
 */
export function ImportSection() {
	const t = useTranslations();
	return (
		<SettingsSection
			id="import"
			title={t('timeImport.entry.TITLE')}
			description={t('timeImport.entry.DESCRIPTION')}
		>
			<SettingsSurface>
				<div className={PROVIDER_ROW}>
					<span aria-hidden="true" className={PROVIDER_TILE}>
						<FileImport />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className={SETTINGS_ROW_LABEL}>{t('timeImport.entry.ROW_LABEL')}</span>
						<span className={SETTINGS_ROW_DESCRIPTION}>{t('timeImport.entry.ROW_DESCRIPTION')}</span>
					</div>
					<Button asChild variant="outline" className="shrink-0">
						<Link href={TIME_IMPORT_SETTINGS_PATH}>{t('timeImport.entry.OPEN')}</Link>
					</Button>
				</div>
			</SettingsSurface>
		</SettingsSection>
	);
}
