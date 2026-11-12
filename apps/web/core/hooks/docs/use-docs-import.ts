'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsImportService, type IDocsPdfOptions } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { DOCS_IMPORT_POLL_MS, fileNameFromDisposition, isImportFinished } from '@/core/lib/utils/docs-import';
import type { IDocumentImport, IDocumentImportTarget } from '@/core/types/interfaces/common/docs-import';
import { useDocsScope } from './use-docs-scope';

/** The probes change only when an operator switches a platform flag: read once a while. */
const PROBE_STALE_MS = 10 * 60_000;

/** Whether an answer says the platform's feature is off (404, or no such route). */
function isFeatureOff(error: unknown): boolean {
	return ApiErrorService.isApiError(error) && (error.isEndpointUnavailable() || error.statusCode === 404);
}

/** The platform's code of a refused request (`DOCS_IMPORT_*`), when it sent one. */
export function errorCodeOf(error: unknown): string | null {
	if (!ApiErrorService.isApiError(error)) return null;
	if (error.errorCode?.startsWith('DOCS_IMPORT_')) return error.errorCode;
	// A refusal before the platform read the zip (a proxy or upload size limit) carries no code of its own.
	return error.statusCode === 413 ? 'DOCS_IMPORT_TOO_LARGE' : null;
}

export interface DocsImportAvailability {
	/** The platform imports exported workspaces for this reader (its probe answered). */
	available: boolean;
	/** The largest zip it takes, in bytes. */
	maxZipBytes: number;
}

/**
 * Whether the Import action is offered: this deployment's flag (`enabled`), then the platform's probe
 * (`GET /plugins/docs/imports`), which answers 404 while the platform's import is off.
 */
export function useDocsImportAvailability(enabled: boolean): DocsImportAvailability {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.importProbe(scope?.tenantId, scope?.organizationId, scope?.userId),
		queryFn: ({ signal }) => docsImportService.probeImport(signal),
		enabled: enabled && scope !== null,
		staleTime: PROBE_STALE_MS,
		retry: (failures, error) => !isFeatureOff(error) && failures < 2
	});
	return { available: query.isSuccess, maxZipBytes: Number(query.data?.maxZipBytes) || 0 };
}

/** Whether the platform exports PDFs (`GET /plugins/docs/exports/pdf`; 404 while off). */
export function useDocsPdfAvailability(enabled: boolean): boolean {
	const scope = useDocsScope();
	const query = useQuery({
		queryKey: queryKeys.docs.pdfProbe(scope?.tenantId),
		queryFn: ({ signal }) => docsImportService.probePdf(signal),
		enabled: enabled && scope !== null,
		staleTime: PROBE_STALE_MS,
		retry: (failures, error) => !isFeatureOff(error) && failures < 2
	});
	return query.isSuccess;
}

export type DocsImportStep = 'pick' | 'uploading' | 'running' | 'done';

/** Whether a read of an import was refused for good (it is gone, or not the reader's any more): its polling stops. */
function isPermanentRefusal(error: unknown): boolean {
	return ApiErrorService.isApiError(error) && (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404);
}

/**
 * One import, from the upload to the report: `start` uploads the zip (progress in `uploadPercent`), then the import is
 * read every {@link DOCS_IMPORT_POLL_MS} until it is over. A refused zip answers its platform code in `error`.
 *
 * The run belongs to the page, not to the dialog that shows it: closing the dialog while the import runs keeps the run,
 * so reopening shows its progress or its report. `onFinished` is called once per import, when it is over, whether the
 * dialog is open or not. A failed read of the progress is told in `trackingError` (after its retry; a refusal for good
 * stops the polling), and `retryRead` reads it again without uploading the zip again.
 *
 * A run belongs to the workspace it started in: a switch of organization (or of user) in the tab puts it away, and an
 * upload that answers after the switch is dropped. The import itself goes on on the platform, in its own workspace.
 */
export function useDocsImportRun(onFinished?: (finished: IDocumentImport) => void) {
	const scope = useDocsScope();
	const queryClient = useQueryClient();
	const [step, setStep] = useState<DocsImportStep>('pick');
	const [uploadPercent, setUploadPercent] = useState(0);
	const [importId, setImportId] = useState<string | null>(null);
	const [started, setStarted] = useState<IDocumentImport | null>(null);
	const [error, setError] = useState<string | null>(null);

	const query = useQuery({
		queryKey: queryKeys.docs.import(scope?.tenantId, importId),
		queryFn: ({ signal }) => docsImportService.getImport(importId as string, signal),
		enabled: importId !== null && scope !== null && !isImportFinished(started),
		refetchInterval: (current) => (isImportFinished(current.state.data) || isPermanentRefusal(current.state.error) ? false : DOCS_IMPORT_POLL_MS),
		retry: (failures, error) => !isPermanentRefusal(error) && failures < 1
	});
	const current = query.data ?? started;
	const finished = isImportFinished(current);
	const shownStep: DocsImportStep = step === 'running' && finished ? 'done' : step;
	const trackingError = shownStep === 'running' && query.isError;
	// Refused for good (gone, or not the reader's): nothing runs here any more, and closing the dialog puts it away.
	const refused = trackingError && isPermanentRefusal(query.error);
	const { refetch } = query;
	const retryRead = useCallback(() => void refetch(), [refetch]);

	// Once per import, whoever shows it (or nobody: the dialog may be closed).
	const onFinishedRef = useRef(onFinished);
	useEffect(() => {
		onFinishedRef.current = onFinished;
	});
	const notifiedRef = useRef<string | null>(null);
	useEffect(() => {
		if (!finished || !current?.id || notifiedRef.current === current.id) return;
		notifiedRef.current = current.id;
		onFinishedRef.current?.(current);
	}, [current, finished]);

	const scopeKey = scope ? `${scope.tenantId}:${scope.organizationId}:${scope.userId}` : null;
	const scopeKeyRef = useRef(scopeKey);

	const start = useCallback(
		async (file: File, target: IDocumentImportTarget) => {
			const startedIn = scopeKeyRef.current;
			setError(null);
			setUploadPercent(0);
			setStep('uploading');
			try {
				const accepted = await docsImportService.startImport(file, target, setUploadPercent);
				// The workspace changed meanwhile: the run was put away, and this answer is another workspace's.
				if (scopeKeyRef.current !== startedIn) return;
				setStarted(accepted);
				setImportId(accepted.id);
				setStep(isImportFinished(accepted) ? 'done' : 'running');
				// The probe also lists the reader's imports.
				void queryClient.invalidateQueries({ queryKey: queryKeys.docs.importProbe(scope?.tenantId, scope?.organizationId, scope?.userId) });
			} catch (error_) {
				if (scopeKeyRef.current !== startedIn) return;
				setError(errorCodeOf(error_) ?? 'DOCS_IMPORT_FAILED');
				setStep('pick');
			}
		},
		[queryClient, scope]
	);

	const reset = useCallback(() => {
		setStep('pick');
		setUploadPercent(0);
		setImportId(null);
		setStarted(null);
		setError(null);
	}, []);

	// Another workspace (a switch of organization or of user, not the scope going away for a moment): the run is put away.
	useEffect(() => {
		if (!scopeKey || scopeKeyRef.current === scopeKey) return;
		const previous = scopeKeyRef.current;
		scopeKeyRef.current = scopeKey;
		if (previous) reset();
	}, [reset, scopeKey]);

	/** An upload, or an import that is not over yet (and still readable): closing the dialog keeps it. */
	const inProgress = shownStep === 'uploading' || (shownStep === 'running' && !refused);

	return { step: shownStep, uploadPercent, current, error, trackingError, retryRead, inProgress, start, reset };
}

/** One import run, as the dialog shows it. */
export type DocsImportRun = ReturnType<typeof useDocsImportRun>;

/** Saves a blob under a name (an object URL and a transient link). */
export function saveBlob(blob: Blob, name: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = name;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	// Revoking at once races the download in Safari.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads a page (or a subtree) as PDF under the name the platform gives it; answers the HTTP status of a refusal. */
export async function downloadDocsPdf(pageId: string, options: IDocsPdfOptions = {}): Promise<{ ok: true } | { ok: false; status: number | null }> {
	try {
		const { blob, disposition } = await docsImportService.downloadPdf(pageId, options);
		saveBlob(blob, fileNameFromDisposition(disposition, options.subtree && options.zip ? 'pages.zip' : 'page.pdf'));
		return { ok: true };
	} catch (error) {
		return { ok: false, status: ApiErrorService.isApiError(error) ? error.statusCode : null };
	}
}
