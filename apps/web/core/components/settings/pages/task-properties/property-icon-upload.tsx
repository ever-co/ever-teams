'use client';

import { ChangeEvent, DragEvent, useId, useRef, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Image as ImageIcon, Spinner, Upload } from '@/core/components/icons';
import { TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { usePropertyIconUpload } from '@/core/hooks/settings/use-property-icon-upload';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	PROPERTY_ICON_ACCEPT_ATTRIBUTE,
	PROPERTY_ICON_MAX_MEGABYTES,
	propertyIconFileProblemOf,
	type PropertyIconFileProblem
} from '@/core/lib/utils/property-icon-upload';
import { isUploadedIcon } from '@/core/lib/utils/property-icon-value';
import type { TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';
import { PropertyIconImage } from './property-icon-image';

const FILE_PROBLEM_KEYS: Record<PropertyIconFileProblem, DottedLanguageObjectStringPaths> = {
	type: 'settings.taskProperties.ICON_UPLOAD_TYPE_ERROR',
	size: 'settings.taskProperties.ICON_UPLOAD_SIZE_ERROR'
};

interface PropertyIconUploadProps {
	kind: TaskPropertySettingsKind;
	/** The stored icon, see `property-icon-value.ts`. */
	value: string | null;
	/** The `fullIconUrl` of the stored icon. */
	valueUrl?: string | null;
	onPick: (value: string) => void;
}

/**
 * The upload side of the icon picker: the current image of the property, if it has one, and a file button (or a drop)
 * that checks the image, uploads it with its progress, and picks it as the icon like a library icon is picked. The
 * property shows it once it is saved; until then the file the user picked stands in for it.
 */
export function PropertyIconUpload({ kind, value, valueUrl, onPick }: Readonly<PropertyIconUploadProps>) {
	const t = useTranslations();
	const hintId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const { upload, isUploading, progress } = usePropertyIconUpload();
	const uploadedValue = isUploadedIcon(value) ? value : null;

	let hint: string = t('settings.taskProperties.ICON_UPLOAD_HINT', { size: PROPERTY_ICON_MAX_MEGABYTES });
	if (isUploading) {
		hint = t('settings.taskProperties.ICON_UPLOADING');
	}
	if (isUploading && progress !== null) {
		hint = t('settings.taskProperties.ICON_UPLOADING_PROGRESS', { progress });
	}

	let chooseLabel: string = t('settings.taskProperties.ICON_UPLOAD_CHOOSE');
	if (uploadedValue) {
		chooseLabel = t('settings.taskProperties.ICON_UPLOAD_REPLACE');
	}

	const send = async (file: File | undefined) => {
		if (!file || isUploading) {
			return;
		}
		const problem = propertyIconFileProblemOf(file);
		if (problem) {
			setError(t(FILE_PROBLEM_KEYS[problem], { size: PROPERTY_ICON_MAX_MEGABYTES }));
			return;
		}
		setError(null);
		try {
			const picked = await upload(file);
			if (picked) {
				onPick(picked);
			}
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t('settings.taskProperties.ICON_UPLOAD_FAILED', { reason: t(reasonKey) }));
		}
	};

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		// The same file can be picked again after an error
		event.target.value = '';
		void send(file);
	};

	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		void send(event.dataTransfer.files?.[0]);
	};

	return (
		<div className="flex flex-col gap-2 p-2">
			<div
				onDragOver={handleDragOver}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				className={cn(
					'flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-center transition-colors',
					isDragging && 'border-primary bg-primary/5'
				)}
			>
				<span
					aria-hidden="true"
					className="flex size-10 items-center justify-center rounded-md bg-foreground/[0.04] text-muted-foreground"
				>
					{uploadedValue && (
						<PropertyIconImage
							value={uploadedValue}
							url={valueUrl}
							className="size-6"
							fallback={<TaskPropertyPlaceholderIcon kind={kind} className="size-6" />}
						/>
					)}
					{!uploadedValue && <ImageIcon className="size-5" />}
				</span>
				<p id={hintId} aria-live="polite" className="text-xs text-muted-foreground">
					{hint}
				</p>
				<input
					ref={inputRef}
					type="file"
					accept={PROPERTY_ICON_ACCEPT_ATTRIBUTE}
					onChange={handleFileChange}
					disabled={isUploading}
					aria-label={chooseLabel}
					className="sr-only"
					tabIndex={-1}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					autoFocus
					onClick={() => inputRef.current?.click()}
					disabled={isUploading}
					aria-describedby={hintId}
				>
					{isUploading && <Spinner className="size-3.5 animate-spin" />}
					{!isUploading && <Upload />}
					{chooseLabel}
				</Button>
			</div>
			{isUploading && (
				<div
					role="progressbar"
					aria-label={t('settings.taskProperties.ICON_UPLOADING')}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress ?? undefined}
					className="h-1 w-full overflow-hidden rounded-full bg-foreground/10"
				>
					<div
						className={cn(
							'h-full rounded-full bg-primary transition-[width] duration-150',
							progress === null && 'w-1/3 animate-pulse'
						)}
						style={progress === null ? undefined : { width: `${progress}%` }}
					/>
				</div>
			)}
			{error && (
				<p role="alert" className="text-xs text-destructive-ink">
					{error}
				</p>
			)}
		</div>
	);
}
