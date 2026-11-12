'use client';

import { type ChangeEvent, type DragEvent, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, FileCsv, Upload } from '@/core/components/icons';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import type { PickedFile } from '@/core/hooks/timesheet/use-time-import';
import { cn } from '@/core/lib/helpers';
import {
	TIME_IMPORT_HEADERS,
	TIME_IMPORT_MAX_ROWS,
	type TimeImportFileProblem
} from '@/core/lib/utils/time-import-sheet';
import { FILE_NAME_TEXT, TIME_IMPORT_MAX_MEGABYTES, type TimeImportCopy } from './time-import-copy';

const DROP_ZONE =
	'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg hairline-border border-dashed border-foreground/20 px-4 py-7 text-center outline-none transition-colors hover:border-foreground/35 hover:bg-foreground/[0.025] focus-visible:ring-[3px] focus-visible:ring-ring/25';

const DROP_ZONE_ACTIVE = 'border-primary/50 bg-primary/[0.04]';

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
	return event.dataTransfer.types.includes('Files');
}

interface TimeImportUploadProps {
	teamName: string;
	canImportForOthers: boolean;
	refusedFileName: string;
	fileProblem: TimeImportFileProblem | null;
	copy: TimeImportCopy;
	onFile: (file: PickedFile) => void;
	onDownloadTemplate: () => void;
}

export function TimeImportUpload({
	teamName,
	canImportForOthers,
	refusedFileName,
	fileProblem,
	copy,
	onFile,
	onDownloadTemplate
}: Readonly<TimeImportUploadProps>) {
	const t = useTranslations();
	const inputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const hintId = useId();
	const [isDragging, setIsDragging] = useState(false);

	const pick = () => inputRef.current?.click();

	const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (file) {
			onFile(file);
		}
	};

	const handleDragOver = (event: DragEvent<HTMLElement>) => {
		if (!hasDraggedFiles(event)) {
			return;
		}
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (event: DragEvent<HTMLElement>) => {
		const next = event.relatedTarget as Node | null;
		const staysInside = Boolean(next) && event.currentTarget.contains(next);
		if (!staysInside) {
			setIsDragging(false);
		}
	};

	const handleDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setIsDragging(false);
		const file = event.dataTransfer.files[0];
		if (file) {
			onFile(file);
		}
	};

	let dropTitle = t('timeImport.DROP_TITLE');
	if (isDragging) {
		dropTitle = t('timeImport.DROP_ACTIVE');
	}
	let whoseTimeNote = t('timeImport.OWN_TIME_NOTE');
	if (canImportForOthers) {
		whoseTimeNote = t('timeImport.OTHERS_NOTE', { team: teamName, column: TIME_IMPORT_HEADERS.memberEmail });
	}

	return (
		<SettingsSection
			id="time-import"
			title={t('timeImport.SECTION_TITLE')}
			description={t('timeImport.SECTION_DESCRIPTION', { team: teamName })}
		>
			{fileProblem && (
				<Notice
					tone="error"
					title={
						<span className={FILE_NAME_TEXT}>
							{t('timeImport.FILE_PROBLEM_TITLE', { fileName: refusedFileName })}
						</span>
					}
					description={copy.fileProblemText(fileProblem)}
				/>
			)}
			<SettingsSurface>
				<SettingsRow
					leading={<FileCsv aria-hidden="true" className="size-4" />}
					label={t('timeImport.TEMPLATE_LABEL')}
					description={t('timeImport.TEMPLATE_DESCRIPTION')}
				>
					<Button type="button" variant="outline" onClick={onDownloadTemplate}>
						<Download aria-hidden="true" />
						{t('timeImport.TEMPLATE_DOWNLOAD')}
					</Button>
				</SettingsRow>
				<div className="p-3" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
					<button
						type="button"
						onClick={pick}
						aria-labelledby={titleId}
						aria-describedby={hintId}
						className={cn(DROP_ZONE, isDragging && DROP_ZONE_ACTIVE)}
					>
						<Upload aria-hidden="true" className="size-4 text-muted-foreground" />
						<span id={titleId} className="text-[13px] font-medium text-foreground">
							{dropTitle}
						</span>
						<span id={hintId} className="text-xs text-pretty text-muted-foreground">
							{t('timeImport.DROP_HINT', {
								megabytes: TIME_IMPORT_MAX_MEGABYTES,
								rows: TIME_IMPORT_MAX_ROWS
							})}
						</span>
					</button>
					<input
						ref={inputRef}
						type="file"
						accept=".csv,text/csv"
						tabIndex={-1}
						aria-hidden="true"
						data-testid="time-import-file"
						onChange={handlePicked}
						className="sr-only"
					/>
				</div>
			</SettingsSurface>
			<SettingsReadOnlyNote>{whoseTimeNote}</SettingsReadOnlyNote>
		</SettingsSection>
	);
}
