import {
	CHAT_MESSAGE_MAX_ATTACHMENTS,
	CHAT_MESSAGE_MAX_LENGTH,
	type IChatFile,
	type IChatMessage
} from '@/core/types/interfaces/common/chat';

/**
 * The files of a message as the composer holds them before the send: each is uploaded to the organization's documents
 * as soon as it is picked, so the send itself only names the documents.
 */
export type ChatAttachmentStatus = 'uploading' | 'ready' | 'failed';

export interface ChatAttachmentDraft {
	/** Local key of the entry (the document id is known only once the upload answers). */
	key: string;
	name: string;
	size: number;
	mimeType: string;
	status: ChatAttachmentStatus;
	documentId?: string;
	/** A local preview of an image (an object URL), shown while it uploads and until the send. */
	previewUrl?: string;
}

/** Longer edge, in pixels, an image is shrunk to before its upload: a photo straight off a phone is several times that. */
export const CHAT_IMAGE_MAX_EDGE = 2048;

/** The image types shrunk in the browser (a GIF would lose its animation, an SVG is not a bitmap). */
const SHRINKABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Whether a picked file is a photo or a screenshot the browser can redraw smaller (JPEG, PNG, WebP). */
export function isShrinkableImage(type: string): boolean {
	return SHRINKABLE_IMAGE_TYPES.has(type.toLowerCase());
}

/**
 * The size an image is drawn at to fit `maxEdge` on its longer side, keeping its proportions; null when it already
 * fits (it is uploaded as it is).
 */
export function shrunkSize(
	width: number,
	height: number,
	maxEdge = CHAT_IMAGE_MAX_EDGE
): { width: number; height: number } | null {
	if (!(width > 0) || !(height > 0)) return null;
	const longer = Math.max(width, height);
	if (longer <= maxEdge) return null;
	const scale = maxEdge / longer;
	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The document ids of the files ready to go with the message, in the order they were added. */
export function readyAttachmentIds(items: readonly ChatAttachmentDraft[]): string[] {
	return items.filter((item) => item.status === 'ready' && item.documentId).map((item) => item.documentId as string);
}

/** Whether one of the composer's files is still on its way up: the send waits for it. */
export function isUploadingAny(items: readonly ChatAttachmentDraft[]): boolean {
	return items.some((item) => item.status === 'uploading');
}

/**
 * Splits picked files into those that fit the message (at most {@link CHAT_MESSAGE_MAX_ATTACHMENTS} files, the ones
 * already held counted) and those that do not, keeping the order they were picked in.
 */
export function withinAttachmentLimit<T>(
	picked: readonly T[],
	held: number,
	max = CHAT_MESSAGE_MAX_ATTACHMENTS
): { accepted: T[]; refused: T[] } {
	const room = Math.max(0, max - held);
	return { accepted: picked.slice(0, room), refused: picked.slice(room) };
}

/**
 * The body an older version of this app gave a message sent with files and no words (the platform wanted a body then):
 * the files' names, cut to the longest body the platform takes. A message of files only is now sent with an empty
 * body; this still recognises the older ones (see {@link isFallbackBody}).
 */
export function attachmentFallbackBody(names: readonly string[], max = CHAT_MESSAGE_MAX_LENGTH): string {
	const text = names
		.map((name) => name.trim())
		.filter(Boolean)
		.join(', ');
	if (text.length <= max) return text;
	return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Whether the body of a message is only the names of its files (sent with no words): it is not shown again. */
export function isFallbackBody(body: string, files: readonly Pick<IChatFile, 'name' | 'originalFilename'>[]): boolean {
	if (!files.length || !body.trim()) return false;
	const named = attachmentFallbackBody(files.map((file) => file.originalFilename || file.name));
	const plain = attachmentFallbackBody(files.map((file) => file.name));
	return body.trim() === named || body.trim() === plain;
}

/** The names a message's files had when it was sent or last edited (`attachmentNames`, one per line), without blanks. */
export function attachmentNamesOf(message: Pick<IChatMessage, 'attachmentNames'>): string[] {
	return (message.attachmentNames ?? '')
		.split('\n')
		.map((name) => name.trim())
		.filter(Boolean);
}

/**
 * Whether a message has files and no words. Not a deleted message: that one has `deletedAt`, whatever its body.
 */
export function isFilesOnlyMessage(
	message: Pick<IChatMessage, 'body' | 'attachmentIds' | 'attachmentNames' | 'deletedAt'>
): boolean {
	if (message.deletedAt || (message.body ?? '').trim()) return false;
	return attachmentIdsOf(message).length > 0 || attachmentNamesOf(message).length > 0;
}

/**
 * The one line a message of files only reads as where a message is previewed (a thread in the list, a quote):
 * `📎 report.pdf, photo.jpg`; the word for a file when the names are not known (a platform older than them).
 */
export function filesOnlyLine(names: readonly string[], fileWord: string): string {
	const known = names.map((name) => name.trim()).filter(Boolean);
	return `📎 ${known.length ? known.join(', ') : fileWord}`;
}

/** The largest a single picture's thumbnail is drawn, in CSS pixels (its box in the timeline). */
const CHAT_THUMB_MAX_WIDTH = 320;
const CHAT_THUMB_MAX_HEIGHT = 240;

/**
 * The box a picture's thumbnail takes before it loads, so the timeline does not jump when it does: its width, fitted
 * into the thumbnail's box with its proportions kept, and its aspect ratio (the height follows). Null when the platform
 * did not say how large the picture is (it is then drawn as it loads).
 */
export function pictureBoxOf(
	file: Pick<IChatFile, 'width' | 'height'>,
	maxWidth = CHAT_THUMB_MAX_WIDTH,
	maxHeight = CHAT_THUMB_MAX_HEIGHT
): { width: number; aspectRatio: string } | null {
	const { width, height } = file;
	if (typeof width !== 'number' || typeof height !== 'number') return null;
	// `Number.isFinite` leaves out NaN and the infinities; a picture has a size above zero.
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
	const scale = Math.min(1, maxWidth / width, maxHeight / height);
	return { width: Math.max(1, Math.round(width * scale)), aspectRatio: `${width} / ${height}` };
}

/** The files of a drop or a paste (`DataTransfer`): only real files, never text or a link. */
export function filesOfTransfer(transfer: Pick<DataTransfer, 'files'> | null | undefined): File[] {
	if (!transfer?.files) return [];
	return Array.from(transfer.files).filter((file) => file.size > 0 || file.type !== '');
}

/** Whether a drag carries files (and not text being moved inside the page). */
export function isFileDrag(transfer: Pick<DataTransfer, 'types'> | null | undefined): boolean {
	return !!transfer && Array.from(transfer.types ?? []).includes('Files');
}

/** Only a web address is opened or shown as an image; anything else the server sends is ignored. */
export function isWebUrl(url: string | null | undefined): url is string {
	if (!url) return false;
	try {
		const { protocol } = new URL(url);
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
}

/** The address a picture is shown at: the small one for a thumbnail, the full one for the lightbox, either standing in for the other. */
export function pictureUrlOf(file: Pick<IChatFile, 'fileUrl' | 'thumbUrl'>, size: 'thumb' | 'full'): string | null {
	const [first, second] = size === 'thumb' ? [file.thumbUrl, file.fileUrl] : [file.fileUrl, file.thumbUrl];
	if (isWebUrl(first)) return first;
	if (isWebUrl(second)) return second;
	return null;
}

/** Whether a file shows as a picture: an image the browser draws, never an SVG (a document that can run script). */
export function isPictureFile(file: Pick<IChatFile, 'mimeType' | 'name'>): boolean {
	const mime = (file.mimeType ?? '').toLowerCase();
	if (mime) return mime.startsWith('image/') && !mime.includes('svg');
	return /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.name);
}

/** The ids a message names as its files, without repeats. */
export function attachmentIdsOf(message: Pick<IChatMessage, 'attachmentIds' | 'deletedAt'>): string[] {
	if (message.deletedAt) return [];
	return [...new Set((message.attachmentIds ?? []).map(String).filter(Boolean))];
}

/**
 * The files the messages name that the files list does not know yet (a message that just arrived): the list is read
 * again for them. A message still being sent is left out: its files are not linked before the platform answers.
 */
export function unknownAttachmentIds(messages: readonly IChatMessage[], known: ReadonlyMap<string, unknown>): string[] {
	const missing = new Set<string>();
	for (const message of messages) {
		if ('outbox' in message && (message as { outbox?: unknown }).outbox) continue;
		for (const id of attachmentIdsOf(message)) if (!known.has(id)) missing.add(id);
	}
	return [...missing];
}

/** The files of a conversation by document id; the newest copy of a document wins. */
export function filesById(files: readonly IChatFile[]): Map<string, IChatFile> {
	const byId = new Map<string, IChatFile>();
	for (const file of files) if (!byId.has(String(file.documentId))) byId.set(String(file.documentId), file);
	return byId;
}
