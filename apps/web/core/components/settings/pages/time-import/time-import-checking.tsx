'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { FILE_NAME_TEXT } from './time-import-copy';

interface TimeImportCheckingProps {
	fileName: string;
	rowCount: number;
	hasFailed: boolean;
	onRetry: () => void;
	onChooseAnother: () => void;
}

export function TimeImportChecking({
	fileName,
	rowCount,
	hasFailed,
	onRetry,
	onChooseAnother
}: Readonly<TimeImportCheckingProps>) {
	const t = useTranslations();

	if (hasFailed) {
		return (
			<SettingsSection title={t('timeImport.SECTION_TITLE')}>
				<Notice
					tone="error"
					title={<span className={FILE_NAME_TEXT}>{t('timeImport.CHECK_FAILED_TITLE', { fileName })}</span>}
					description={t('timeImport.CHECK_FAILED_DESCRIPTION')}
					actions={
						<>
							<Button type="button" variant="outline" onClick={onRetry}>
								{t('timeImport.RETRY')}
							</Button>
							<Button type="button" variant="ghost" onClick={onChooseAnother}>
								{t('timeImport.CHOOSE_ANOTHER')}
							</Button>
						</>
					}
				/>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection title={t('timeImport.SECTION_TITLE')}>
			<SettingsSurface>
				<output aria-busy="true" className="flex min-h-14 items-center gap-3 px-4 py-3">
					<Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
					<span className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-[13px] font-medium text-foreground">
							{t('timeImport.CHECKING_TITLE', { fileName })}
						</span>
						<span className="text-xs text-muted-foreground">
							{t('timeImport.CHECKING_DESCRIPTION', { count: rowCount })}
						</span>
					</span>
				</output>
			</SettingsSurface>
		</SettingsSection>
	);
}
