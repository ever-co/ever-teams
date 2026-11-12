'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Lock } from '@/core/components/icons';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { type TimeImport, useTimeImport } from '@/core/hooks/timesheet/use-time-import';
import { type TimeImportAccess, useTimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import { downloadCsv } from '@/core/lib/utils/dashboard-export';
import {
	TIME_IMPORT_TEMPLATE_FILE_NAME,
	timeImportReportCsvColumnsOf,
	timeImportReportFileNameOf,
	timeImportTemplateCsvColumnsOf,
	type TimeImportReportLine
} from '@/core/lib/utils/time-import-report';
import { rowStatusOf } from '@/core/lib/utils/time-import-rows';
import { TimeImportChecking } from './time-import-checking';
import { TimeImportColumnsGuide } from './time-import-columns-guide';
import { type TimeImportCopy, useTimeImportCopy } from './time-import-copy';
import { TimeImportResult } from './time-import-result';
import { TimeImportSettingsSkeleton } from './time-import-settings-skeleton';
import { TimeImportUpload } from './time-import-upload';

const REASON_SEPARATOR = ' ';

function reportLinesOf(timeImport: TimeImport, copy: TimeImportCopy): TimeImportReportLine[] {
	const { rows, run, report } = timeImport;
	const refusedRow = report?.refusal?.row ?? null;
	return rows.map((row) => {
		const status = rowStatusOf(row, run);
		const reasons = copy.reasonsOf(row, run, refusedRow);
		return {
			row: row.row,
			cells: row.cells,
			status: copy.statusLabel(status),
			reason: reasons.join(REASON_SEPARATOR)
		};
	});
}

function TimeImportFlow({ access }: Readonly<{ access: TimeImportAccess }>) {
	const copy = useTimeImportCopy();
	const timeImport = useTimeImport({ contextAt: access.contextAt, saveScope: access.saveScope });
	const { canImportForOthers } = access;
	const { stage, chooseFile } = timeImport;

	const downloadTemplate = useCallback(() => {
		const columns = timeImportTemplateCsvColumnsOf(canImportForOthers);
		downloadCsv([], columns, TIME_IMPORT_TEMPLATE_FILE_NAME);
	}, [canImportForOthers]);

	const downloadReport = useCallback(() => {
		const namesMembers = timeImport.rows.some((row) => row.cells.memberEmail !== '');
		const columns = timeImportReportCsvColumnsOf(canImportForOthers || namesMembers);
		const fileName = timeImportReportFileNameOf(new Date());
		downloadCsv(reportLinesOf(timeImport, copy), columns, fileName);
	}, [canImportForOthers, copy, timeImport]);

	const isIdle = stage === 'idle';
	const isChecking = stage === 'checking';
	const showsRows = !isIdle && !isChecking;

	return (
		<>
			{isIdle && (
				<TimeImportUpload
					teamName={access.teamName}
					canImportForOthers={canImportForOthers}
					refusedFileName={timeImport.fileName}
					fileProblem={timeImport.fileProblem}
					copy={copy}
					onFile={(file) => void chooseFile(file)}
					onDownloadTemplate={downloadTemplate}
				/>
			)}
			{isChecking && (
				<TimeImportChecking
					fileName={timeImport.fileName}
					rowCount={timeImport.fileRowCount}
					hasFailed={timeImport.hasCheckFailed}
					onRetry={timeImport.retryCheck}
					onChooseAnother={timeImport.reset}
				/>
			)}
			{showsRows && <TimeImportResult timeImport={timeImport} copy={copy} onDownloadReport={downloadReport} />}
			{isIdle && (
				<TimeImportColumnsGuide
					canImportForOthers={canImportForOthers}
					matchesEveryTeamTask={access.matchesEveryTeamTask}
				/>
			)}
		</>
	);
}

function TimeImportBlocked({ access }: Readonly<{ access: TimeImportAccess }>) {
	const t = useTranslations();

	if (access.hasLoadFailed) {
		return (
			<Notice
				tone="error"
				title={t('timeImport.access.LOAD_FAILED_TITLE')}
				description={t('timeImport.access.LOAD_FAILED_DESCRIPTION')}
				actions={
					<Button type="button" variant="outline" onClick={access.retryLoad}>
						{t('timeImport.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (access.refusal === 'manualTimeOff') {
		return (
			<Notice
				tone="neutral"
				glyph={<Lock />}
				title={t('timeImport.access.MANUAL_TIME_OFF_TITLE')}
				description={t('timeImport.access.MANUAL_TIME_OFF_DESCRIPTION', {
					organization: access.organizationName
				})}
			/>
		);
	}
	return (
		<Notice
			tone="neutral"
			glyph={<Lock />}
			title={t('timeImport.access.NO_PERMISSION_TITLE')}
			description={t('timeImport.access.NO_PERMISSION_DESCRIPTION')}
		/>
	);
}

function TimeImportGate() {
	const t = useTranslations();
	const access = useTimeImportAccess();
	const teamId = access.saveScope.organizationTeamId;
	// The team whose import is on screen. Once shown it stays, whatever reloads behind it: a refresh of the team's
	// tasks must neither drop a staged file nor stop an import that is saving
	const [openedTeamId, setOpenedTeamId] = useState<string | null>(null);
	const isOpened = openedTeamId === teamId;
	const isLoaded = !access.isLoading && !access.hasLoadFailed;
	const isAllowed = access.refusal === null;
	const isOpenable = isLoaded && isAllowed;
	if (isOpenable && !isOpened) {
		setOpenedTeamId(teamId);
	}
	const showsFlow = isOpened || isOpenable;

	if (access.isLoading && !showsFlow) {
		return <TimeImportSettingsSkeleton />;
	}
	return (
		<SettingsPage title={t('settings.entries.import.TITLE')} description={t('settings.entries.import.DESCRIPTION')}>
			{showsFlow && <TimeImportFlow key={teamId} access={access} />}
			{!showsFlow && <TimeImportBlocked access={access} />}
		</SettingsPage>
	);
}

export function TimeImportSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<TimeImportSettingsSkeleton />}>
			<TimeImportGate />
		</TeamSettingsGate>
	);
}
