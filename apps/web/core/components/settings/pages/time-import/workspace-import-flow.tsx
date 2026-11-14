'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Lock, Spinner } from '@/core/components/icons';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import type { TimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import { useWorkspaceImport } from '@/core/hooks/timesheet/use-workspace-import';
import { TimeImportChecking } from './time-import-checking';
import { TimeImportColumnsStep } from './time-import-columns-step';
import { FILE_NAME_TEXT, useTimeImportCopy } from './time-import-copy';
import { TimeImportResult } from './time-import-result';
import { useTimeImportReportDownload } from './use-time-import-report-download';
import { WorkspaceImportFiles } from './workspace-import-files';
import { WorkspaceImportPlanPanel } from './workspace-import-plan-panel';
import { WorkspaceImportProgress } from './workspace-import-progress';
import { WorkspaceImportUpload } from './workspace-import-upload';

const ENTRIES_JUDGED_STAGES = ['preview', 'rechecking', 'importing', 'done'];

function Waiting({ title, label }: Readonly<{ title: string; label: string }>) {
	return (
		<SettingsSection title={title}>
			<SettingsSurface>
				<output aria-busy="true" className="flex min-h-14 items-center gap-3 px-4 py-3">
					<Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
					<span className="text-[13px] font-medium text-foreground">{label}</span>
				</output>
			</SettingsSurface>
		</SettingsSection>
	);
}

interface WorkspaceImportFlowProps {
	access: TimeImportAccess;
	/** The choice between this import and the time entries one, shown while nothing is chosen yet. */
	modeSwitch: ReactNode;
}

/**
 * The import of another tool's workspace export: the files, what they hold, the clients, projects and labels to create
 * or reuse, then the entries with the time import's own columns step, preview and report.
 */
export function WorkspaceImportFlow({ access, modeSwitch }: Readonly<WorkspaceImportFlowProps>) {
	const t = useTranslations();
	const copy = useTimeImportCopy();
	const workspace = useWorkspaceImport(access);
	const { rights, files, isReading, plan, creationPlan, creation, timeImport } = workspace;
	const { stage, columnsStep, fileProblem } = timeImport;
	const downloadReport = useTimeImportReportDownload(timeImport, copy, access.canImportForOthers);

	if (!rights.canStart) {
		return (
			<>
				{modeSwitch}
				<Notice
					tone="neutral"
					glyph={<Lock />}
					title={t('timeImport.workspace.NO_RIGHTS_TITLE')}
					description={t('timeImport.workspace.NO_RIGHTS_DESCRIPTION')}
				/>
			</>
		);
	}
	if (isReading) {
		return <Waiting title={t('timeImport.workspace.SECTION_TITLE')} label={t('timeImport.workspace.READING')} />;
	}
	if (!files) {
		return (
			<>
				{modeSwitch}
				<WorkspaceImportUpload teamName={access.teamName} onFiles={(picked) => void workspace.chooseFiles(picked)} />
			</>
		);
	}

	const hasStarted = creation.status !== 'idle';
	const isCreating = creation.status === 'creating';
	const hasFailed = creation.status === 'failed';
	const isSavingEntries = stage === 'rechecking' || stage === 'importing';
	const isBusy = isCreating || isSavingEntries;
	const isEntriesJudged = ENTRIES_JUDGED_STAGES.includes(stage);
	const showsPlan = plan !== null && !hasStarted;
	const showsProgress = creationPlan !== null && hasStarted;
	const showsEntries = workspace.hasEntries && isEntriesJudged && !isCreating && !hasFailed;
	const isEntriesRefused = workspace.hasEntries && fileProblem !== null;
	let chooseOther: (() => void) | undefined = workspace.reset;
	if (isBusy) {
		chooseOther = undefined;
	}

	return (
		<>
			<WorkspaceImportFiles files={files} onChooseOther={chooseOther} />
			{workspace.isLoadingExisting && (
				<Waiting title={t('timeImport.workspace.PLAN_TITLE')} label={t('timeImport.workspace.EXISTING_LOADING')} />
			)}
			{workspace.hasExistingFailed && (
				<Notice
					tone="error"
					title={t('timeImport.workspace.EXISTING_FAILED_TITLE')}
					description={t('timeImport.workspace.EXISTING_FAILED_DESCRIPTION')}
					actions={
						<Button type="button" variant="outline" onClick={workspace.retryExisting}>
							{t('timeImport.RETRY')}
						</Button>
					}
				/>
			)}
			{isEntriesRefused && fileProblem && (
				<Notice
					tone="error"
					title={
						<span className={FILE_NAME_TEXT}>
							{t('timeImport.FILE_PROBLEM_TITLE', { fileName: timeImport.fileName })}
						</span>
					}
					description={copy.fileProblemText(fileProblem)}
				/>
			)}
			{columnsStep && (
				<TimeImportColumnsStep
					fileName={timeImport.fileName}
					step={columnsStep}
					copy={copy}
					onChooseColumn={timeImport.chooseColumn}
					onChooseDateOrder={timeImport.chooseDateOrder}
					onConfirm={() => void timeImport.confirmColumns()}
					onChooseAnother={workspace.reset}
				/>
			)}
			{stage === 'checking' && (
				<TimeImportChecking
					fileName={timeImport.fileName}
					rowCount={timeImport.fileRowCount}
					hasFailed={timeImport.hasCheckFailed}
					onRetry={timeImport.retryCheck}
					onChooseAnother={workspace.reset}
				/>
			)}
			{showsPlan && (
				<WorkspaceImportPlanPanel
					plan={plan}
					canCreateLabels={rights.canCreateLabels}
					readyEntryCount={timeImport.summary.readyCount}
					onImportLists={() => void workspace.confirm()}
				/>
			)}
			{showsProgress && (
				<WorkspaceImportProgress
					plan={creationPlan}
					creation={creation}
					hasEntries={workspace.creationSavesEntries}
					onReset={workspace.reset}
				/>
			)}
			{showsEntries && <TimeImportResult timeImport={timeImport} copy={copy} onDownloadReport={downloadReport} />}
		</>
	);
}
