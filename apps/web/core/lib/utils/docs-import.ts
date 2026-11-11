import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { EDocumentKind } from '@/core/types/interfaces/common/docs';
import type { IDocumentImport, IDocumentImportReportItem } from '@/core/types/interfaces/common/docs-import';

/**
 * Pure helpers of the Docs import dialog and the PDF download: progress, the report by outcome, the message keys of
 * the platform's reasons, codes and phases, the zip check and the name of a download.
 */

/** How often a running import is read again. */
export const DOCS_IMPORT_POLL_MS = 1500;

/** How many items of each list the report shows. */
export const DOCS_IMPORT_REPORT_ROWS = 50;

const REASON_KEYS: Readonly<Record<string, DottedLanguageObjectStringPaths>> = {
	ENCRYPTED: 'docs.IMPORT.REASON.ENCRYPTED',
	TOO_LARGE: 'docs.IMPORT.REASON.TOO_LARGE',
	UNSUPPORTED_TYPE: 'docs.IMPORT.REASON.UNSUPPORTED_TYPE',
	QUOTA_EXCEEDED: 'docs.IMPORT.REASON.QUOTA_EXCEEDED',
	PARENT_MISSING: 'docs.IMPORT.REASON.PARENT_MISSING',
	READ_FAILED: 'docs.IMPORT.REASON.READ_FAILED',
	CREATE_FAILED: 'docs.IMPORT.REASON.CREATE_FAILED',
	CONVERSION_FAILED: 'docs.IMPORT.REASON.CONVERSION_FAILED',
	PLAIN_TEXT: 'docs.IMPORT.REASON.PLAIN_TEXT'
};

const ERROR_KEYS: Readonly<Record<string, DottedLanguageObjectStringPaths>> = {
	DOCS_IMPORT_FILE_REQUIRED: 'docs.IMPORT.ERROR.FILE_REQUIRED',
	DOCS_IMPORT_TOO_LARGE: 'docs.IMPORT.ERROR.TOO_LARGE',
	DOCS_IMPORT_NOT_A_ZIP: 'docs.IMPORT.ERROR.NOT_A_ZIP',
	DOCS_IMPORT_TOO_MANY_ENTRIES: 'docs.IMPORT.ERROR.TOO_MANY_ENTRIES',
	DOCS_IMPORT_UNSAFE_PATH: 'docs.IMPORT.ERROR.UNSAFE_PATH',
	DOCS_IMPORT_SYMLINK: 'docs.IMPORT.ERROR.SYMLINK',
	DOCS_IMPORT_ZIP_BOMB: 'docs.IMPORT.ERROR.ZIP_BOMB',
	DOCS_IMPORT_NO_PAGES: 'docs.IMPORT.ERROR.NO_PAGES',
	DOCS_IMPORT_STALLED: 'docs.IMPORT.ERROR.STALLED',
	DOCS_IMPORT_FAILED: 'docs.IMPORT.ERROR.FAILED'
};

const PHASE_KEYS: Readonly<Record<string, DottedLanguageObjectStringPaths>> = {
	PLANNING: 'docs.IMPORT.PHASE.PLANNING',
	TREE: 'docs.IMPORT.PHASE.TREE',
	CONTENT: 'docs.IMPORT.PHASE.CONTENT',
	DONE: 'docs.IMPORT.PHASE.DONE'
};

/** Every message key these helpers can answer (the locale spec checks each is in every language). */
export const DOCS_IMPORT_MESSAGE_KEYS: readonly DottedLanguageObjectStringPaths[] = [
	...Object.values(REASON_KEYS),
	...Object.values(ERROR_KEYS),
	...Object.values(PHASE_KEYS),
	'docs.IMPORT.REASON.OTHER',
	'docs.IMPORT.PHASE.QUEUED'
];

/** The message of a skipped or failed item's reason (a generic one for a reason this app does not know). */
export const reasonKeyOf = (reason: string | null | undefined): DottedLanguageObjectStringPaths =>
	(reason && REASON_KEYS[reason]) || 'docs.IMPORT.REASON.OTHER';

/** The message of an error code (a generic one for an unknown code, or none). */
export const errorKeyOf = (code: string | null | undefined): DottedLanguageObjectStringPaths =>
	(code && ERROR_KEYS[code]) || 'docs.IMPORT.ERROR.FAILED';

/** The message of a phase (waiting, before the run starts). */
export const phaseKeyOf = (phase: string | null | undefined): DottedLanguageObjectStringPaths =>
	(phase && PHASE_KEYS[phase]) || 'docs.IMPORT.PHASE.QUEUED';

/** Whether an import is over. */
export const isImportFinished = (value: Pick<IDocumentImport, 'status'> | null | undefined): boolean =>
	value?.status === 'COMPLETED' || value?.status === 'FAILED';

/** The progress of an import, 0–100 (100 once it completed; 99 at most before). */
export function importProgressPercent(value: Pick<IDocumentImport, 'status' | 'processedItems' | 'totalItems'> | null | undefined): number {
	if (!value) return 0;
	if (value.status === 'COMPLETED') return 100;
	const total = Number(value.totalItems) || 0;
	if (total <= 0) return 0;
	return Math.max(0, Math.min(99, Math.floor(((Number(value.processedItems) || 0) / total) * 100)));
}

export interface DocsImportReportGroups {
	/** The imported pages, which the report links to. */
	pages: IDocumentImportReportItem[];
	/** What was not imported: the failed, then the skipped. */
	notImported: IDocumentImportReportItem[];
	unresolvedLinks: number;
}

/** The report by outcome. */
export function importReportGroups(value: Pick<IDocumentImport, 'report'> | null | undefined): DocsImportReportGroups {
	const items = value?.report?.items ?? [];
	return {
		pages: items.filter((item) => item.status === 'IMPORTED' && item.kind === EDocumentKind.PAGE && Boolean(item.documentId)),
		notImported: [...items.filter((item) => item.status === 'FAILED'), ...items.filter((item) => item.status === 'SKIPPED')],
		unresolvedLinks: items.reduce((total, item) => total + (Number(item.unresolvedLinks) || 0), 0)
	};
}

/** Whether a picked file looks like a zip (the platform checks the bytes). */
export function isZipFile(file: Pick<File, 'name' | 'type'> | null | undefined): boolean {
	if (!file) return false;
	return /\.zip$/i.test(file.name ?? '') || /^application\/(x-)?zip(-compressed)?$/i.test(file.type ?? '');
}

/** The name of a download from its `Content-Disposition` (the UTF-8 `filename*` first), or the fallback. */
export function fileNameFromDisposition(header: string | null | undefined, fallback: string): string {
	const value = String(header ?? '');
	const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value);
	if (extended) {
		try {
			const decoded = decodeURIComponent(extended[1].trim());
			if (decoded) return decoded;
		} catch {
			// a malformed escape: the plain name is used
		}
	}
	const plain = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(value);
	return (plain?.[1] ?? plain?.[2] ?? '').trim() || fallback;
}

/** A size limit as the dialog names it (`100 MB`). */
export function formatLimit(bytes: number | null | undefined): string {
	const value = Number(bytes) || 0;
	if (value >= 1024 ** 3) return `${Math.round(value / 1024 ** 3)} GB`;
	if (value >= 1024 ** 2) return `${Math.round(value / 1024 ** 2)} MB`;
	if (value >= 1024) return `${Math.round(value / 1024)} KB`;
	return `${value} B`;
}
