'use client';

import { type ChangeEvent, type DragEvent, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from '@/core/components/icons';
import { SettingsReadOnlyNote, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';
import { DROP_ZONE, DROP_ZONE_ACTIVE, hasDraggedFiles } from './time-import-upload';
import { WORKSPACE_IMPORT_ACCEPT, WORKSPACE_IMPORT_MAX_MEGABYTES } from './workspace-import-copy';

interface WorkspaceImportUploadProps {
	teamName: string;
	onFiles: (files: File[]) => void;
}

/** Where the files of another tool's workspace export are dropped or chosen, all at once. */
export function WorkspaceImportUpload({ teamName, onFiles }: Readonly<WorkspaceImportUploadProps>) {
	const t = useTranslations();
	const inputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const hintId = useId();
	const [isDragging, setIsDragging] = useState(false);

	const pick = () => inputRef.current?.click();

	const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = '';
		if (files.length > 0) {
			onFiles(files);
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
		const files = Array.from(event.dataTransfer.files);
		if (files.length > 0) {
			onFiles(files);
		}
	};

	let dropTitle = t('timeImport.workspace.DROP_TITLE');
	if (isDragging) {
		dropTitle = t('timeImport.workspace.DROP_ACTIVE');
	}

	return (
		<SettingsSection
			id="workspace-import"
			title={t('timeImport.workspace.SECTION_TITLE')}
			description={t('timeImport.workspace.SECTION_DESCRIPTION', { team: teamName })}
		>
			<SettingsSurface>
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
							{t('timeImport.workspace.DROP_HINT', { megabytes: WORKSPACE_IMPORT_MAX_MEGABYTES })}
						</span>
					</button>
					<input
						ref={inputRef}
						type="file"
						multiple
						accept={WORKSPACE_IMPORT_ACCEPT}
						tabIndex={-1}
						aria-hidden="true"
						data-testid="workspace-import-files"
						onChange={handlePicked}
						className="sr-only"
					/>
				</div>
			</SettingsSurface>
			<SettingsReadOnlyNote>{t('timeImport.workspace.FILES_NOTE')}</SettingsReadOnlyNote>
		</SettingsSection>
	);
}
