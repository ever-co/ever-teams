'use client';

import { memo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Attachment, CircleAlert, ExternalLink, RotateLeft, Spinner, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Dialog, DialogContent, DialogTitle } from '@/core/components/common/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { FileGlyph } from '@/core/components/common/entity-files/entity-file-glyph';
import { cn } from '@/core/lib/helpers';
import { uploadedFileOf } from '@/core/hooks/chat/use-chat-attachments';
import { useChatFiles } from '@/core/hooks/chat/use-chat-files';
import { isPictureFile, isWebUrl, type ChatAttachmentDraft } from '@/core/lib/utils/chat-attachments';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { fullDateTime } from '@/core/lib/utils/chat-timeline';
import { fileKindOf, formatFileSize } from '@/core/lib/utils/entity-files';
import type { IChatFile } from '@/core/types/interfaces/common/chat';

const CHIP =
	'inline-flex h-9 max-w-64 items-center gap-2 rounded-lg bg-card ps-1.5 text-xs text-foreground hairline-ring ring-border shadow-xs shadow-black/5';

const CHIP_BUTTON =
	'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [@media(pointer:coarse)]:size-8';

/** The files of the message being written: each with its state, a retry when its upload failed, and a way to take it out. */
export function ComposerAttachments({
	items,
	onRemove,
	onRetry
}: Readonly<{
	items: readonly ChatAttachmentDraft[];
	onRemove: (key: string) => void;
	onRetry: (key: string) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	if (!items.length) return null;
	return (
		<ul className="flex flex-wrap gap-1.5 px-2 pb-1 pt-0.5" aria-label={t('teamChat.ATTACH_FILES')}>
			{items.map((item) => {
				const failed = item.status === 'failed';
				const uploading = item.status === 'uploading';
				const removeLabel = t('entityFiles.REMOVE', { name: item.name });
				return (
					<li
						key={item.key}
						className={cn(CHIP, 'pe-0.5', failed && 'ring-destructive/50')}
						data-status={item.status}
					>
						<span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
							{item.previewUrl ? (
								// A local preview of a picked picture (an object URL): never a remote address.
								<img src={item.previewUrl} alt="" className="size-full object-cover" />
							) : (
								<FileGlyph kind={fileKindOf(item.mimeType, item.name)} size="sm" />
							)}
							{uploading && (
								<span className="absolute inset-0 flex items-center justify-center bg-background/60">
									<Spinner className="size-3.5 animate-spin text-foreground" aria-hidden="true" />
								</span>
							)}
						</span>
						<span className="flex min-w-0 flex-col leading-tight">
							<span className="truncate font-medium">{item.name}</span>
							<span
								className={cn(
									'truncate text-[11px] tabular-nums',
									failed ? 'text-destructive' : 'text-muted-foreground'
								)}
							>
								{failed
									? t('entityFiles.UPLOAD_FAILED')
									: uploading
										? t('entityFiles.UPLOADING', { size: formatFileSize(item.size, locale) })
										: formatFileSize(item.size, locale)}
							</span>
						</span>
						{failed && (
							<button
								type="button"
								onClick={() => onRetry(item.key)}
								aria-label={t('entityFiles.RETRY')}
								title={t('entityFiles.RETRY')}
								className={CHIP_BUTTON}
							>
								<RotateLeft className="size-3.5" />
							</button>
						)}
						<button
							type="button"
							onClick={() => onRemove(item.key)}
							aria-label={removeLabel}
							title={removeLabel}
							className={CHIP_BUTTON}
						>
							<X className="size-3.5" />
						</button>
					</li>
				);
			})}
		</ul>
	);
}

/** One file a message names: what the conversation's file list says of it, or (sent from this tab) what was uploaded. */
interface ShownAttachment {
	id: string;
	file: IChatFile | null;
	name: string;
	mimeType: string | null;
	size: number | null;
}

function shownAttachmentOf(id: string, files: ReadonlyMap<string, IChatFile>, fallbackName: string): ShownAttachment {
	const file = files.get(id) ?? null;
	if (file)
		return {
			id,
			file,
			name: file.originalFilename || file.name,
			mimeType: file.mimeType ?? null,
			size: file.fileSize ?? null
		};
	const uploaded = uploadedFileOf(id);
	if (uploaded) return { id, file: null, name: uploaded.name, mimeType: uploaded.mimeType, size: uploaded.size };
	return { id, file: null, name: fallbackName, mimeType: null, size: null };
}

/** A picture opened over the page: the image as large as it fits, its name, and the original in a new tab. */
export function ImageLightbox({ file, onClose }: Readonly<{ file: IChatFile | null; onClose: () => void }>) {
	const t = useTranslations();
	const url = file?.fileUrl;
	return (
		<Dialog open={!!file && isWebUrl(url)} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-auto max-w-[min(64rem,calc(100%-2rem))] gap-3 p-3">
				<DialogTitle className="truncate pe-9 text-sm font-medium">
					{file ? file.originalFilename || file.name : ''}
				</DialogTitle>
				{file && isWebUrl(url) && (
					<>
						<img
							src={url}
							alt={file.originalFilename || file.name}
							referrerPolicy="no-referrer"
							className="max-h-[calc(100dvh-9rem)] w-auto max-w-full rounded-lg object-contain"
						/>
						<div className="flex justify-end">
							<Button variant="outline" size="sm" asChild>
								<a href={url} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="size-3.5" /> {t('teamChat.OPEN_ORIGINAL')}
								</a>
							</Button>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/**
 * The files of a message: pictures as thumbnails that open in a lightbox, other files as chips that open in a new tab.
 * Only an address the platform gave is shown or opened, and only a web one; a file the list does not have yet shows its
 * name (sent from this tab) or a plain "File", and nothing is fetched for it.
 */
function MessageAttachmentsComponent({
	attachmentIds,
	files,
	onOpenImage,
	onBrokenImage
}: Readonly<{
	attachmentIds: readonly string[];
	files: ReadonlyMap<string, IChatFile>;
	onOpenImage: (file: IChatFile) => void;
	onBrokenImage?: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	if (!attachmentIds.length) return null;
	const shown = attachmentIds.map((id) => shownAttachmentOf(id, files, t('teamChat.ATTACHMENT')));
	const pictures = shown.filter(
		(item) => item.file && isPictureFile(item.file) && isWebUrl(item.file.thumbUrl || item.file.fileUrl)
	);
	const others = shown.filter((item) => !pictures.includes(item));

	return (
		<div className="mt-1.5 flex flex-col gap-1.5">
			{pictures.length > 0 && (
				<ul className="flex flex-wrap gap-1.5" aria-label={t('teamChat.FILES')}>
					{pictures.map((item) => {
						const file = item.file as IChatFile;
						return (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => onOpenImage(file)}
									aria-label={t('teamChat.VIEW_IMAGE', { name: item.name })}
									title={item.name}
									className="block cursor-zoom-in overflow-hidden rounded-lg bg-foreground/[0.04] outline-none hairline-ring ring-border focus-visible:ring-[3px] focus-visible:ring-ring/25"
								>
									<img
										src={(file.thumbUrl || file.fileUrl) as string}
										alt={item.name}
										loading="lazy"
										referrerPolicy="no-referrer"
										onError={onBrokenImage}
										className={cn(
											'block max-h-60 w-auto max-w-full object-cover',
											pictures.length > 1 ? 'size-32 sm:size-40' : 'max-w-[min(20rem,100%)]'
										)}
									/>
								</button>
							</li>
						);
					})}
				</ul>
			)}
			{others.length > 0 && (
				<ul className="flex flex-wrap gap-1.5">
					{others.map((item) => {
						const url = item.file?.fileUrl;
						const opens = isWebUrl(url);
						const content = (
							<>
								<FileGlyph kind={fileKindOf(item.mimeType, item.name)} size="sm" />
								<span className="min-w-0 truncate font-medium">{item.name}</span>
								{item.size !== null && (
									<span className="shrink-0 tabular-nums text-muted-foreground">
										{formatFileSize(item.size, locale)}
									</span>
								)}
							</>
						);
						return (
							<li key={item.id}>
								{opens ? (
									<a
										href={url}
										target="_blank"
										rel="noopener noreferrer"
										title={t('entityFiles.OPEN', { name: item.name })}
										className={cn(
											CHIP,
											'pe-2.5 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25'
										)}
									>
										{content}
									</a>
								) : (
									<span className={cn(CHIP, 'pe-2.5 text-muted-foreground')}>{content}</span>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export const MessageAttachments = memo(MessageAttachmentsComponent);

/**
 * The header's Files: every file the conversation's messages carry, newest first, with who shared it and when; a
 * picture opens in the lightbox, another file in a new tab.
 */
export function ConversationFilesButton({
	conversationId,
	people,
	peopleByUser,
	className
}: Readonly<{
	conversationId: string;
	people: ReadonlyMap<string, ChatPerson>;
	peopleByUser: ReadonlyMap<string, ChatPerson>;
	className?: string;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [isOpen, setIsOpen] = useState(false);
	const [picture, setPicture] = useState<IChatFile | null>(null);
	const files = useChatFiles(isOpen ? conversationId : null);
	const label = t('teamChat.FILES');

	return (
		<>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger aria-label={label} title={label} className={className}>
					<Attachment />
				</PopoverTrigger>
				<PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] p-1">
					<p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</p>
					{files.isLoading && (
						<div aria-hidden="true" className="flex h-10 items-center gap-2.5 px-2">
							<span className="size-6 shrink-0 animate-pulse rounded-md bg-foreground/[0.06]" />
							<span className="h-2.5 w-2/5 animate-pulse rounded-full bg-foreground/[0.06]" />
						</div>
					)}
					{files.isError && (
						<p className="flex items-center gap-2 px-2 py-2 text-[13px] text-muted-foreground">
							<CircleAlert className="size-4 shrink-0" aria-hidden="true" />
							{t('entityFiles.LOAD_FAILED')}
						</p>
					)}
					{!files.isLoading && !files.isError && files.files.length === 0 && (
						<p className="px-2 py-2 text-[13px] text-muted-foreground">{t('teamChat.FILES_EMPTY')}</p>
					)}
					{files.files.length > 0 && (
						<ul className="max-h-80 overflow-y-auto">
							{files.files.map((file) => {
								const name = file.originalFilename || file.name;
								const author =
									(file.authorEmployeeId && people.get(String(file.authorEmployeeId))) ||
									(file.authorUserId && peopleByUser.get(String(file.authorUserId))) ||
									null;
								const when = fullDateTime(new Date(file.attachedAt), locale);
								const meta = [author?.name, when].filter(Boolean).join(' · ');
								const isPicture = isPictureFile(file) && isWebUrl(file.fileUrl);
								const row = (
									<>
										<FileGlyph kind={fileKindOf(file.mimeType, name)} size="sm" />
										<span className="flex min-w-0 flex-1 flex-col leading-tight">
											<span className="truncate text-[13px] text-foreground">{name}</span>
											<span className="truncate text-[11px] text-muted-foreground">{meta}</span>
										</span>
										{file.fileSize !== null && file.fileSize !== undefined && (
											<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
												{formatFileSize(file.fileSize, locale)}
											</span>
										)}
									</>
								);
								const rowClass =
									'flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 py-1 text-start outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25';
								return (
									<li key={`${file.documentId}:${file.messageId}`}>
										{isPicture ? (
											<button
												type="button"
												className={cn(rowClass, 'cursor-pointer')}
												onClick={() => setPicture(file)}
											>
												{row}
											</button>
										) : isWebUrl(file.fileUrl) ? (
											<a
												href={file.fileUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={rowClass}
												title={t('entityFiles.OPEN', { name })}
											>
												{row}
											</a>
										) : (
											<div className={rowClass}>{row}</div>
										)}
									</li>
								);
							})}
						</ul>
					)}
					{files.hasMore && (
						<div className="flex justify-center p-1">
							<Button variant="ghost" size="sm" onClick={files.loadMore} disabled={files.isLoadingMore}>
								{files.isLoadingMore && (
									<Spinner className="size-3.5 animate-spin" aria-hidden="true" />
								)}
								{t('teamChat.LOAD_MORE')}
							</Button>
						</div>
					)}
				</PopoverContent>
			</Popover>
			<ImageLightbox file={picture} onClose={() => setPicture(null)} />
		</>
	);
}
