'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { docsService } from '@/core/services/client/api/docs';
import { saveBlob, zipExportFailureOf, zipExportFileName } from '@/core/lib/utils/docs-export';
import type { IDocumentPage } from '@/core/types/interfaces/common/docs';

export interface DocsZipExportOptions {
	/** Runs first; false stops the export (the page's latest text could not be saved). */
	beforeExport?: () => Promise<boolean>;
	/** The title to name the file by, when it is newer than the page's (a title being typed). */
	title?: string;
}

/**
 * The zip export of a page or a folder with what is under it, from the platform: one at a time, with a toast while it
 * is made. A platform that exports pages only (409 for a folder) is told plainly.
 */
export function useDocsZipExport() {
	const t = useTranslations();
	const [exportingId, setExportingId] = useState<string | null>(null);
	const busyRef = useRef(false);

	const run = useCallback(
		async (page: Pick<IDocumentPage, 'id' | 'name' | 'kind'>, options: DocsZipExportOptions = {}) => {
			if (busyRef.current) return;
			busyRef.current = true;
			setExportingId(page.id);
			const toastId = toast.loading(t('docs.EXPORTING'));
			try {
				// The zip is of the text as saved: the person's latest text goes first, or nothing is exported.
				if (options.beforeExport && !(await options.beforeExport())) {
					toast.error(t('docs.EXPORT_UNSAVED'), { id: toastId });
					return;
				}
				const blob = await docsService.exportSubtreeZip(page.id);
				saveBlob(blob, zipExportFileName({ name: options.title ?? page.name }, t('docs.UNTITLED')));
				toast.dismiss(toastId);
			} catch (error) {
				const failure = zipExportFailureOf(error, page.kind);
				toast.error(failure === 'folder-unsupported' ? t('docs.EXPORT_FOLDER_UNSUPPORTED') : t('docs.EXPORT_ERROR'), { id: toastId });
			} finally {
				busyRef.current = false;
				setExportingId(null);
			}
		},
		[t]
	);

	return { run, exportingId, isExporting: exportingId !== null };
}
