'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileCsv, FileText, FileZip } from '@/core/components/icons';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';
import type { WorkspaceFileProblem, WorkspaceFiles } from '@/core/lib/utils/workspace-import-files';
import { FILE_NAME_TEXT } from './time-import-copy';
import { type WorkspaceImportCopy, useWorkspaceImportCopy } from './workspace-import-copy';

const ARCHIVED_FILE = /\.zip \/ /iu;
const JSON_FILE = /\.json( \/ |$)/iu;

function FileGlyph({ fileName }: Readonly<{ fileName: string }>) {
	const glyphClass = 'size-4 shrink-0 text-muted-foreground';
	if (ARCHIVED_FILE.test(fileName)) {
		return <FileZip aria-hidden="true" className={glyphClass} />;
	}
	if (JSON_FILE.test(fileName)) {
		return <FileText aria-hidden="true" className={glyphClass} />;
	}
	return <FileCsv aria-hidden="true" className={glyphClass} />;
}

function ProblemList({
	problems,
	copy
}: Readonly<{ problems: ReadonlyArray<WorkspaceFileProblem>; copy: WorkspaceImportCopy }>) {
	return (
		<ul className="mt-1 flex flex-col gap-1">
			{problems.map((problem, index) => (
				<li key={`${problem.fileName}-${index}`} className="flex flex-col gap-0.5 sm:flex-row sm:gap-1.5">
					<span className={cn('font-medium text-foreground', FILE_NAME_TEXT)}>{problem.fileName}</span>
					<span>{copy.problemText(problem)}</span>
				</li>
			))}
		</ul>
	);
}

interface WorkspaceImportFilesProps {
	files: WorkspaceFiles;
	/** Left out while the import saves: other files then would cut it short. */
	onChooseOther?: () => void;
}

/** The files of the export as they were read: what each one holds, and every file left out with the reason. */
export function WorkspaceImportFiles({ files, onChooseOther }: Readonly<WorkspaceImportFilesProps>) {
	const t = useTranslations();
	const copy = useWorkspaceImportCopy();
	const { read, problems } = files;
	const hasRead = read.length > 0;
	const hasProblems = problems.length > 0;
	const showsLeftOut = hasRead && hasProblems;

	const chooseOther = (
		<Button type="button" variant="outline" onClick={onChooseOther}>
			{t('timeImport.workspace.CHOOSE_OTHER')}
		</Button>
	);

	if (!hasRead) {
		return (
			<SettingsSection id="workspace-import-files" title={t('timeImport.workspace.FILES_TITLE')}>
				<Notice
					tone="error"
					title={t('timeImport.workspace.NOTHING_READ')}
					description={<ProblemList problems={problems} copy={copy} />}
					actions={chooseOther}
				/>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection
			id="workspace-import-files"
			title={t('timeImport.workspace.FILES_TITLE')}
			actions={
				onChooseOther && (
					<Button type="button" variant="ghost" size="sm" onClick={onChooseOther}>
						{t('timeImport.workspace.CHOOSE_OTHER')}
					</Button>
				)
			}
		>
			<SettingsSurface>
				<ul className="flex flex-col hairline-divide-y divide-border">
					{read.map((table) => (
						<li key={table.fileName} className="flex items-start gap-3 px-4 py-3 sm:items-center">
							<FileGlyph fileName={table.fileName} />
							<div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
								<span className={cn('text-[13px] font-medium text-foreground', FILE_NAME_TEXT)}>
									{table.fileName}
								</span>
								<span className="flex shrink-0 items-center gap-2">
									<Badge variant="secondary">{copy.kindLabel(table.kind)}</Badge>
									<span className="text-xs tabular-nums text-muted-foreground">
										{t('timeImport.workspace.FILE_ROWS', { count: table.table.records.length })}
									</span>
								</span>
							</div>
						</li>
					))}
				</ul>
			</SettingsSurface>
			{showsLeftOut && (
				<Notice
					tone="warning"
					title={t('timeImport.workspace.LEFT_OUT_TITLE', { count: problems.length })}
					description={<ProblemList problems={problems} copy={copy} />}
				/>
			)}
		</SettingsSection>
	);
}
