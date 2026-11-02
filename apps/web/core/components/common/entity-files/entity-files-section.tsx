'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Attachment, Plus, Spinner, Upload, X } from '@/core/components/icons';
import { FileGlyph } from './entity-file-glyph';
import { useEntityFiles, type EntityFiles, type PendingUpload } from '@/core/hooks/documents/use-entity-files';
import { cn } from '@/core/lib/helpers';
import { commentIdOf, fileKindOf, fileNameOf, formatFileSize } from '@/core/lib/utils/entity-files';
import type { TEntityFileLink, TEntityFileOwner } from '@/core/types/schemas/documents/entity-file.schema';
import { EntityFilesLoadingRows } from './entity-files-loading-rows';

/** Row actions stay quiet until the row is hovered or focused, and are always there on touch screens. */
const ROW_ACTION =
	'text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
	return event.dataTransfer.types.includes('Files');
}

function FileRow({ link, files, canEdit }: Readonly<{ link: TEntityFileLink; files: EntityFiles; canEdit: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const format = useFormatter();
	const name = fileNameOf(link);
	const document = link.document;
	const kind = fileKindOf(document?.mimeType, name);
	const isRemoving = files.removingIds.includes(link.id);
	const metaParts: string[] = [];
	const fileSize = document?.fileSize;
	if (typeof fileSize === 'number') {
		metaParts.push(formatFileSize(fileSize, locale));
	}
	if (link.createdAt) {
		metaParts.push(format.dateTime(new Date(link.createdAt), { month: 'short', day: 'numeric' }));
	}
	if (commentIdOf(link)) {
		metaParts.push(t('entityFiles.FROM_COMMENT'));
	}
	return (
		<li className="group flex min-h-12 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/[0.03]">
			<button
				type="button"
				onClick={() => void files.open(link)}
				title={t('entityFiles.OPEN', { name })}
				className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-0.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<FileGlyph kind={kind} />
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
					<span className="truncate text-xs tabular-nums text-muted-foreground">{metaParts.join(' · ')}</span>
				</span>
			</button>
			{canEdit && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => void files.remove(link)}
					disabled={isRemoving}
					aria-label={t('entityFiles.REMOVE', { name })}
					title={t('entityFiles.REMOVE', { name })}
					className={cn(ROW_ACTION, isRemoving && 'opacity-100')}
				>
					{isRemoving && <Spinner className="animate-spin" />}
					{!isRemoving && <X />}
				</Button>
			)}
		</li>
	);
}

function PendingRow({ entry }: Readonly<{ entry: PendingUpload }>) {
	const t = useTranslations();
	const locale = useLocale();
	return (
		<li className="flex min-h-12 items-center gap-3 px-1.5 py-1" aria-live="polite">
			<span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-foreground/5">
				<Spinner aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{entry.name}</span>
				<span className="truncate text-xs text-muted-foreground">
					{t('entityFiles.UPLOADING', { size: formatFileSize(entry.size, locale) })}
				</span>
			</span>
		</li>
	);
}

function EmptyDropTarget({ canEdit, onPick }: Readonly<{ canEdit: boolean; onPick: () => void }>) {
	const t = useTranslations();
	if (!canEdit) {
		return <p className="text-[13px] text-muted-foreground">{t('entityFiles.EMPTY_READ_ONLY')}</p>;
	}
	return (
		<button
			type="button"
			onClick={onPick}
			className="flex w-full items-center justify-center gap-2 rounded-lg hairline-border border-dashed border-border px-4 py-5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.025] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<Upload aria-hidden="true" className="size-4" />
			{t('entityFiles.EMPTY')}
		</button>
	);
}

function StatusLine({ files }: Readonly<{ files: EntityFiles }>) {
	const t = useTranslations();
	if (files.state === 'forbidden') {
		return <p className="text-[13px] text-muted-foreground">{t('entityFiles.FORBIDDEN')}</p>;
	}
	return (
		<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
			<span>{t('entityFiles.LOAD_FAILED')}</span>
			<Button type="button" variant="ghost" size="sm" onClick={() => void files.retry()}>
				{t('entityFiles.RETRY')}
			</Button>
		</div>
	);
}

interface EntityFilesSectionProps {
	entity: TEntityFileOwner;
	entityId: string;
	/** False for someone who may read the record but not change it. */
	canEdit?: boolean;
	className?: string;
}

/**
 * The files of a task, a project or a comment: attach by button or by dropping them on the section, open one in a
 * new tab, take one off the record (with Undo). Absent when the server runs without Gauzy's Documents plugin.
 */
export function EntityFilesSection({ entity, entityId, canEdit = true, className }: EntityFilesSectionProps) {
	const t = useTranslations();
	const files = useEntityFiles({ entity, entityId });
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	if (files.state === 'unavailable') {
		return null;
	}

	const count = files.files.length;
	const hasFiles = count > 0;
	const hasPending = files.pending.length > 0;
	const isReady = files.state === 'ready';
	const isLoading = files.state === 'loading';
	const showsEmpty = isReady && !hasFiles && !hasPending;
	const showsStatus = !isReady && !isLoading;
	const acceptsDrops = canEdit && isReady;
	const showsAttach = acceptsDrops;
	const showsList = hasFiles || hasPending;

	const pick = () => inputRef.current?.click();

	const handlePicked = (event: ChangeEvent<HTMLInputElement>) => {
		const picked = Array.from(event.target.files ?? []);
		event.target.value = '';
		if (picked.length > 0) {
			void files.upload(picked);
		}
	};

	const handleDragOver = (event: DragEvent<HTMLElement>) => {
		if (!acceptsDrops || !hasDraggedFiles(event)) {
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
		if (!acceptsDrops) {
			return;
		}
		event.preventDefault();
		setIsDragging(false);
		const dropped = Array.from(event.dataTransfer.files);
		if (dropped.length > 0) {
			void files.upload(dropped);
		}
	};

	return (
		<section
			aria-label={t('entityFiles.TITLE')}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className={cn(
				'relative flex flex-col gap-2 rounded-lg transition-[background-color,box-shadow]',
				isDragging && 'bg-primary/[0.04] ring-2 ring-primary/30',
				className
			)}
		>
			<div className="flex min-h-7 items-center justify-between gap-2">
				<span className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
					<Attachment aria-hidden="true" className="size-4" />
					{t('entityFiles.TITLE')}
					{hasFiles && <span className="tabular-nums">{count}</span>}
				</span>
				{showsAttach && (
					<Button type="button" variant="ghost" size="sm" onClick={pick} className="text-muted-foreground">
						<Plus />
						{t('entityFiles.ATTACH')}
					</Button>
				)}
				<input
					ref={inputRef}
					type="file"
					multiple
					tabIndex={-1}
					aria-hidden="true"
					onChange={handlePicked}
					className="sr-only"
				/>
			</div>
			{isLoading && <EntityFilesLoadingRows />}
			{showsStatus && <StatusLine files={files} />}
			{showsEmpty && <EmptyDropTarget canEdit={canEdit} onPick={pick} />}
			{showsList && (
				<ul className="flex flex-col">
					{files.pending.map((entry) => (
						<PendingRow key={entry.key} entry={entry} />
					))}
					{files.files.map((link) => (
						<FileRow key={link.id} link={link} files={files} canEdit={canEdit} />
					))}
				</ul>
			)}
			{isDragging && (
				<p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-medium text-primary-ink">
					{t('entityFiles.DROP_HINT')}
				</p>
			)}
		</section>
	);
}
