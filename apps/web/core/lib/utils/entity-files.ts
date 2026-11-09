import type { TEntityFileLink } from '@/core/types/schemas/documents/entity-file.schema';

export type FileKind = 'image' | 'pdf' | 'sheet' | 'doc' | 'slides' | 'archive' | 'audio' | 'video' | 'text' | 'other';

const KIND_BY_EXTENSION: Record<string, FileKind> = {
	pdf: 'pdf',
	xls: 'sheet',
	xlsx: 'sheet',
	csv: 'sheet',
	ods: 'sheet',
	doc: 'doc',
	docx: 'doc',
	odt: 'doc',
	rtf: 'doc',
	ppt: 'slides',
	pptx: 'slides',
	odp: 'slides',
	key: 'slides',
	zip: 'archive',
	rar: 'archive',
	'7z': 'archive',
	tar: 'archive',
	gz: 'archive',
	txt: 'text',
	md: 'text',
	json: 'text'
};

const KIND_BY_MIME_PREFIX: [string, FileKind][] = [
	['image/', 'image'],
	['audio/', 'audio'],
	['video/', 'video'],
	['text/', 'text']
];

function extensionOf(name: string) {
	const dot = name.lastIndexOf('.');
	if (dot < 0) {
		return '';
	}
	return name.slice(dot + 1).toLowerCase();
}

/** The kind drawn for a file: its MIME type when Gauzy sniffed one, its extension otherwise. */
export function fileKindOf(mimeType: string | null | undefined, name: string): FileKind {
	const rawMime = mimeType ?? '';
	const mime = rawMime.toLowerCase();
	for (const [prefix, kind] of KIND_BY_MIME_PREFIX) {
		if (mime.startsWith(prefix)) {
			return kind;
		}
	}
	if (mime === 'application/pdf') {
		return 'pdf';
	}
	const extension = extensionOf(name);
	return KIND_BY_EXTENSION[extension] ?? 'other';
}

const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** `2.4 MB`, `830 kB`, in the reader's locale. */
export function formatFileSize(bytes: number, locale: string) {
	let value = bytes;
	let unitIndex = 0;
	const lastUnit = SIZE_UNITS.length - 1;
	while (value >= 1000 && unitIndex < lastUnit) {
		value = value / 1000;
		unitIndex += 1;
	}
	const formatter = new Intl.NumberFormat(locale, {
		style: 'unit',
		unit: SIZE_UNITS[unitIndex],
		unitDisplay: 'short',
		maximumFractionDigits: 1
	});
	return formatter.format(value);
}

export function fileNameOf(link: TEntityFileLink) {
	const document = link.document;
	return document?.name || document?.originalFilename || '';
}

/** Files above the size the server accepts are refused before they travel. */
export function splitBySize(files: File[], maxBytes: number) {
	const accepted: File[] = [];
	const tooLarge: File[] = [];
	for (const file of files) {
		if (file.size > maxBytes) {
			tooLarge.push(file);
			continue;
		}
		accepted.push(file);
	}
	return { accepted, tooLarge };
}

export function inBatches<T>(items: T[], size: number) {
	const batches: T[][] = [];
	for (let start = 0; start < items.length; start += size) {
		batches.push(items.slice(start, start + size));
	}
	return batches;
}

function linkedAtOf(link: TEntityFileLink) {
	return link.createdAt ?? '';
}

function newestFirst(first: TEntityFileLink, second: TEntityFileLink) {
	return linkedAtOf(second).localeCompare(linkedAtOf(first));
}

/** The files a link list holds, newest first; a folder linked to the record is not a file to show here. */
export function filesOf(links: TEntityFileLink[]) {
	// Folders are not files, and pages (the Docs tab of a project) are not attachments.
	const files = links.filter((link) => link.document?.kind !== 'FOLDER' && link.document?.kind !== 'PAGE');
	return [...files].sort(newestFirst);
}

/** The comment a task file was posted with, when it came with one. */
export function commentIdOf(link: TEntityFileLink): string | null {
	const metadata = link.metadata;
	const isRecord = typeof metadata === 'object' && metadata !== null;
	if (!isRecord) {
		return null;
	}
	const commentId = (metadata as { commentId?: unknown }).commentId;
	if (typeof commentId !== 'string') {
		return null;
	}
	return commentId;
}

/** The task's files grouped by the comment they were posted with. */
export function filesByComment(links: TEntityFileLink[]) {
	const groups = new Map<string, TEntityFileLink[]>();
	for (const link of links) {
		const commentId = commentIdOf(link);
		if (!commentId) {
			continue;
		}
		const group = groups.get(commentId) ?? [];
		group.push(link);
		groups.set(commentId, group);
	}
	return groups;
}
