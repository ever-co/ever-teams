'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
	WORKSPACE_IMPORT_MAX_FILE_BYTES,
	WORKSPACE_JSON_MAX_COLUMNS,
	WORKSPACE_JSON_MAX_RECORDS,
	type WorkspaceFileKind,
	type WorkspaceFileProblem
} from '@/core/lib/utils/workspace-import-files';
import { WORKSPACE_ZIP_MAX_BYTES, type ZipProblem } from '@/core/lib/utils/workspace-import-zip';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const WORKSPACE_IMPORT_MAX_MEGABYTES = WORKSPACE_IMPORT_MAX_FILE_BYTES / BYTES_PER_MEGABYTE;

const WORKSPACE_ZIP_MAX_MEGABYTES = WORKSPACE_ZIP_MAX_BYTES / BYTES_PER_MEGABYTE;

export const WORKSPACE_IMPORT_ACCEPT = '.csv,.json,.zip,text/csv,application/json,application/zip';

/** The texts of the workspace import that depend on what a file holds or why it was left out. */
export function useWorkspaceImportCopy() {
	const t = useTranslations();

	const kindLabel = useCallback(
		(kind: WorkspaceFileKind) => {
			const labels: Record<WorkspaceFileKind, string> = {
				entries: t('timeImport.workspace.KIND_entries'),
				clients: t('timeImport.workspace.KIND_clients'),
				projects: t('timeImport.workspace.KIND_projects'),
				tags: t('timeImport.workspace.KIND_tags')
			};
			return labels[kind];
		},
		[t]
	);

	const zipProblemText = useCallback(
		(problem: ZipProblem) => {
			const texts: Record<ZipProblem, string> = {
				notZip: t('timeImport.workspace.problems.zip_notZip'),
				encrypted: t('timeImport.workspace.problems.zip_encrypted'),
				unsupported: t('timeImport.workspace.problems.zip_unsupported'),
				tooLarge: t('timeImport.workspace.problems.zip_tooLarge', { megabytes: WORKSPACE_ZIP_MAX_MEGABYTES })
			};
			return texts[problem];
		},
		[t]
	);

	const problemText = useCallback(
		(problem: WorkspaceFileProblem): string => {
			switch (problem.code) {
				case 'notSupported':
					return t('timeImport.workspace.problems.notSupported');
				case 'tooLarge':
					return t('timeImport.workspace.problems.tooLarge', { megabytes: WORKSPACE_IMPORT_MAX_MEGABYTES });
				case 'notText':
					return t('timeImport.workspace.problems.notText');
				case 'zip':
					return zipProblemText(problem.problem);
				case 'json':
					return t('timeImport.workspace.problems.json');
				case 'jsonTooLarge':
					return t('timeImport.workspace.problems.jsonTooLarge', {
						records: WORKSPACE_JSON_MAX_RECORDS,
						columns: WORKSPACE_JSON_MAX_COLUMNS
					});
				case 'csv':
					return t('timeImport.workspace.problems.csv');
				case 'unknownContent':
					return t('timeImport.workspace.problems.unknownContent');
				case 'entriesColumnsDiffer':
					return t('timeImport.workspace.problems.entriesColumnsDiffer');
				case 'repeatedKind':
					return t('timeImport.workspace.problems.repeatedKind', { kind: kindLabel(problem.kind) });
			}
		},
		[kindLabel, t, zipProblemText]
	);

	return useMemo(() => ({ kindLabel, problemText }), [kindLabel, problemText]);
}

export type WorkspaceImportCopy = ReturnType<typeof useWorkspaceImportCopy>;
