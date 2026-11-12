import type { EDocumentKind, EDocumentVisibility } from './docs';

/**
 * The platform's import of exported workspaces into Docs (a Markdown vault or an HTML export zip) and its PDF export
 * (`/plugins/docs/imports`, `/plugins/docs/documents/:id/export.pdf`, ever-gauzy `docs-import-export` spec). Both are
 * behind default-off flags on the platform, whose routes then answer 404.
 */

export type TDocumentImportStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type TDocumentImportPhase = 'PLANNING' | 'TREE' | 'CONTENT' | 'DONE';
export type TDocumentImportLayout = 'MARKDOWN_VAULT' | 'HTML_EXPORT';
export type TDocumentImportItemStatus = 'IMPORTED' | 'SKIPPED' | 'FAILED';

/** One entry of the zip in the report. */
export interface IDocumentImportReportItem {
	path: string;
	kind: EDocumentKind;
	status: TDocumentImportItemStatus;
	documentId?: string;
	name?: string;
	/** A stable code: `UNSUPPORTED_TYPE`, `TOO_LARGE`, `QUOTA_EXCEEDED`, … */
	reason?: string;
	unresolvedLinks?: number;
}

export interface IDocumentImportReport {
	items: IDocumentImportReportItem[];
	truncated?: boolean;
}

/** One import run. */
export interface IDocumentImport {
	id: string;
	status: TDocumentImportStatus;
	phase?: TDocumentImportPhase | null;
	layout?: TDocumentImportLayout | null;
	fileName: string;
	fileSize?: number | null;
	parentId?: string | null;
	visibility?: EDocumentVisibility | null;
	organizationTeamId?: string | null;
	totalItems: number;
	processedItems: number;
	importedCount: number;
	skippedCount: number;
	failedCount: number;
	errorCode?: string | null;
	errorMessage?: string | null;
	report?: IDocumentImportReport | null;
	createdAt?: string;
	finishedAt?: string | null;
}

/** The import probe: the reader's last imports and the largest zip the import takes. */
export interface IDocumentImportList {
	items: IDocumentImport[];
	maxZipBytes: number;
}

/** Where an import lands: under a page, or at the top of a space. */
export interface IDocumentImportTarget {
	parentId?: string | null;
	visibility?: EDocumentVisibility;
	organizationTeamId?: string | null;
}

/** The PDF export probe. */
export interface IDocumentPdfExportCapabilities {
	maxPages: number;
}
