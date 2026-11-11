import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EDocumentKind, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { markdownFileName } from './docs-markdown';
import { pageTitle } from './docs-tree';

/**
 * The zip export of a page or a folder with what is under it (`GET …/:id/export/markdown?subtree=true`): which rows
 * offer it, the file's name, and what a refusal means.
 */

/** Whether a row offers the zip: a folder always (its pages and sub-folders), a page when it has sub-pages. */
export function offersZipExport(page: Pick<IDocumentPage, 'kind'>, hasChildren: boolean): boolean {
	if (page.kind === EDocumentKind.FOLDER) return true;
	return page.kind === EDocumentKind.PAGE && hasChildren;
}

/** The zip's file name: the title, made safe for a file system. */
export function zipExportFileName(page: Pick<IDocumentPage, 'name'>, untitled: string): string {
	return markdownFileName(pageTitle(page, untitled)).replace(/\.md$/, '.zip');
}

/**
 * Why a zip export failed:
 * - `folder-unsupported`: the platform exports pages only (409 for a folder): the export of folders needs a newer one;
 * - `failed`: anything else.
 */
export type DocsZipExportFailure = 'folder-unsupported' | 'failed';

export function zipExportFailureOf(error: unknown, kind: EDocumentKind | null | undefined): DocsZipExportFailure {
	const status = ApiErrorService.isApiError(error) ? error.statusCode : (error as { statusCode?: unknown } | null)?.statusCode;
	return status === 409 && kind === EDocumentKind.FOLDER ? 'folder-unsupported' : 'failed';
}

/** Saves a file the app made (a download the browser starts from memory). */
export function saveBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	// The click starts the download; the address is released once it had the time to.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
