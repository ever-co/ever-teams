'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useTimesheetInvalidation } from '@/core/hooks/timesheet/use-timesheet-invalidation';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { chunksOf } from '@/core/lib/utils/dashboards/timesheets';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	checkedRowsOf,
	draftRowsOf,
	haveSameReadyRows,
	isReadyRow,
	manualTimeRequestOf,
	timeImportLookupsOf,
	timeImportReportOf,
	timeImportSummaryOf,
	type TimeImportContext,
	type TimeImportEntry,
	type TimeImportLookup,
	type TimeImportOutcome,
	type TimeImportRow,
	type TimeImportRun,
	type TimeImportSaveScope
} from '@/core/lib/utils/time-import-rows';
import {
	timeImportFileRefusalOf,
	timeImportSheetOf,
	type TimeImportFileProblem,
	type TimeImportSheet
} from '@/core/lib/utils/time-import-sheet';
import { hasUnreadableInterval } from '@/core/lib/utils/time-log-overlap';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { type TTimeLogConflict, ZodValidationError } from '@/core/types/schemas';

/** Reads of recorded time sent together: a file of a year of days never opens hundreds of requests at once. */
const LOOKUPS_AT_ONCE = 4;

const PROJECT_FIELD = 'projectId';

const PROJECT_REQUIRED_KEY = 'timeImport.problems.PROJECT_REQUIRED';

const RECORDED_MEANWHILE_KEY = 'timeImport.problems.RECORDED_MEANWHILE';

/**
 * `idle`: no file yet, or a file that was refused whole. `checking`: its rows are compared with recorded time.
 * `preview`: every row has its verdict and nothing is saved. `rechecking` then `importing`: the member confirmed.
 * `done`: the report.
 */
type TimeImportStage = 'idle' | 'checking' | 'preview' | 'rechecking' | 'importing' | 'done';

export type PickedFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;

interface TimeImportState {
	stage: TimeImportStage;
	fileName: string;
	fileProblem: TimeImportFileProblem | null;
	sheet: TimeImportSheet | null;
	rows: ReadonlyArray<TimeImportRow>;
	hasCheckFailed: boolean;
	hasPreviewChanged: boolean;
	outcomes: ReadonlyMap<number, TimeImportOutcome>;
}

const NO_OUTCOMES: ReadonlyMap<number, TimeImportOutcome> = new Map();

const NO_HEADERS: ReadonlyArray<string> = [];

const IDLE: TimeImportState = {
	stage: 'idle',
	fileName: '',
	fileProblem: null,
	sheet: null,
	rows: [],
	hasCheckFailed: false,
	hasPreviewChanged: false,
	outcomes: NO_OUTCOMES
};

/** The file's text, or null when its bytes are not UTF-8: a spreadsheet or a file in another encoding. */
async function textOf(file: PickedFile): Promise<string | null> {
	try {
		const bytes = await file.arrayBuffer();
		const decoder = new TextDecoder('utf-8', { fatal: true });
		return decoder.decode(bytes);
	} catch {
		return null;
	}
}

async function readLookup(queryClient: QueryClient, lookup: TimeImportLookup): Promise<TTimeLogConflict[]> {
	const queryKey = queryKeys.timesheet.conflicts({
		tenantId: getTenantIdCookie() || null,
		organizationId: getOrganizationIdCookie() || null,
		employeeId: lookup.employeeId,
		startDate: lookup.start.toISOString(),
		endDate: lookup.end.toISOString(),
		ignoreId: null
	});
	// Never answered from the cache: the timer or another tab may have recorded time since the last read
	const logs = await queryClient.fetchQuery({
		queryKey,
		queryFn: () =>
			timeLogService.getTimeLogConflicts({
				employeeId: lookup.employeeId,
				startDate: lookup.start,
				endDate: lookup.end
			}),
		staleTime: 0,
		retry: false
	});
	// An entry the API would still remove, and that no row can be compared with: an incomplete answer, not a free day
	const hasUnreadableEntry = logs.some((log) => hasUnreadableInterval(log));
	if (hasUnreadableEntry) {
		throw new Error('The time import lookup returned an entry whose time cannot be read');
	}
	return logs;
}

/** Rejects when one read fails or is incomplete: a row is only ever judged on every day it has time on. */
async function readRecordedLogs(queryClient: QueryClient, lookups: ReadonlyArray<TimeImportLookup>) {
	const logsByLookup = new Map<string, TTimeLogConflict[]>();
	const batches = chunksOf(lookups, LOOKUPS_AT_ONCE);
	for (const batch of batches) {
		const reads = batch.map((lookup) => readLookup(queryClient, lookup));
		const batchLogs = await Promise.all(reads);
		batch.forEach((lookup, index) => {
			logsByLookup.set(lookup.key, batchLogs[index]);
		});
	}
	return logsByLookup;
}

/** The key of the sentence that says why the API refused a row: never the server's own text. */
function saveFailureKeyOf(error: unknown): string {
	const missingFields = requiredTrackingFieldsOf(error) ?? [];
	if (missingFields.includes(PROJECT_FIELD)) {
		return PROJECT_REQUIRED_KEY;
	}
	return errorReasonKeyOf(error);
}

async function saveEntry(entry: TimeImportEntry, scope: TimeImportSaveScope): Promise<TimeImportOutcome> {
	try {
		const request = manualTimeRequestOf(entry, scope);
		await timeLogService.addManualTime(request);
		return { kind: 'saved' };
	} catch (error) {
		// The API answered and the entry is saved: only its answer does not have the expected shape
		if (error instanceof ZodValidationError) {
			return { kind: 'saved' };
		}
		logErrorInDev('Time import row refused', error);
		return { kind: 'failed', reasonKey: saveFailureKeyOf(error) };
	}
}

type ReadyRow = TimeImportRow & { entry: TimeImportEntry };

/** The row against its day as the API holds it now, judged the way the preview judged it. */
async function isPlaceStillFree(queryClient: QueryClient, row: ReadyRow): Promise<boolean> {
	const lookups = timeImportLookupsOf([row]);
	const logsByLookup = await readRecordedLogs(queryClient, lookups);
	const [checkedRow] = checkedRowsOf({ rows: [row], logsByLookup, now: new Date() });
	return isReadyRow(checkedRow);
}

/**
 * Saves a row after one more read of its day. The file was checked whole before the first save, and the rows before
 * this one took time to save: an entry recorded meanwhile would be removed whole by this row, so the row is not sent.
 */
async function saveRowIfStillFree(
	queryClient: QueryClient,
	row: ReadyRow,
	scope: TimeImportSaveScope
): Promise<TimeImportOutcome> {
	let isPlaceFree: boolean;
	try {
		isPlaceFree = await isPlaceStillFree(queryClient, row);
	} catch (error) {
		logErrorInDev('Time import check of a row before saving failed', error);
		return { kind: 'failed', reasonKey: errorReasonKeyOf(error) };
	}
	if (!isPlaceFree) {
		return { kind: 'failed', reasonKey: RECORDED_MEANWHILE_KEY };
	}
	return saveEntry(row.entry, scope);
}

interface TimeImportOptions {
	contextAt: (now: Date) => TimeImportContext;
	saveScope: TimeImportSaveScope;
}

/**
 * The import of time entries from a CSV file, from the picked file to the report. A file is read and judged in the
 * browser, row by row, and its rows are compared with the time already recorded. Nothing is saved before
 * `confirm`, which checks the file once more (time may have been recorded while the preview was open) and then
 * saves the ready rows one after the other through the manual time call, each after one more read of its day,
 * stopping at the first refusal or at the first row whose time was recorded meanwhile.
 */
export function useTimeImport({ contextAt, saveScope }: TimeImportOptions) {
	const queryClient = useQueryClient();
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	const [state, setState] = useState<TimeImportState>(IDLE);
	// Counts the files and the runs started: what an older one still awaits is dropped when it answers
	const runRef = useRef(0);

	useEffect(() => {
		return () => {
			runRef.current += 1;
		};
	}, []);

	const isSaving = state.stage === 'rechecking' || state.stage === 'importing';
	useEffect(() => {
		if (!isSaving) {
			return undefined;
		}
		const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener('beforeunload', warnBeforeLeaving);
		return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
	}, [isSaving]);

	const check = useCallback(
		async (sheet: TimeImportSheet): Promise<TimeImportRow[]> => {
			const now = new Date();
			const drafts = draftRowsOf(sheet.rows, contextAt(now));
			const lookups = timeImportLookupsOf(drafts);
			const logsByLookup = await readRecordedLogs(queryClient, lookups);
			return checkedRowsOf({ rows: drafts, logsByLookup, now });
		},
		[contextAt, queryClient]
	);

	const checkSheet = useCallback(
		async (fileName: string, sheet: TimeImportSheet) => {
			runRef.current += 1;
			const run = runRef.current;
			setState({ ...IDLE, stage: 'checking', fileName, sheet });
			try {
				const rows = await check(sheet);
				if (runRef.current === run) {
					setState({ ...IDLE, stage: 'preview', fileName, sheet, rows });
				}
			} catch (error) {
				logErrorInDev('Time import check failed', error);
				if (runRef.current === run) {
					setState({ ...IDLE, stage: 'checking', fileName, sheet, hasCheckFailed: true });
				}
			}
		},
		[check]
	);

	const chooseFile = useCallback(
		async (file: PickedFile) => {
			if (isSaving) {
				return;
			}
			runRef.current += 1;
			const run = runRef.current;
			const fileName = file.name;
			const refusal = timeImportFileRefusalOf(fileName, file.size);
			if (refusal) {
				setState({ ...IDLE, fileName, fileProblem: refusal });
				return;
			}
			const text = await textOf(file);
			if (runRef.current !== run) {
				return;
			}
			if (text === null) {
				setState({ ...IDLE, fileName, fileProblem: { code: 'notText' } });
				return;
			}
			const reading = timeImportSheetOf(text);
			if (!reading.sheet) {
				setState({ ...IDLE, fileName, fileProblem: reading.problem });
				return;
			}
			await checkSheet(fileName, reading.sheet);
		},
		[checkSheet, isSaving]
	);

	const retryCheck = useCallback(() => {
		if (state.sheet) {
			void checkSheet(state.fileName, state.sheet);
		}
	}, [checkSheet, state.fileName, state.sheet]);

	const reset = useCallback(() => {
		runRef.current += 1;
		setState(IDLE);
	}, []);

	const saveRows = useCallback(
		async (run: number, rows: ReadonlyArray<TimeImportRow>) => {
			const outcomes = new Map<number, TimeImportOutcome>();
			for (const row of rows) {
				// The page was left: the rows not sent yet stay unsent
				if (runRef.current !== run) {
					break;
				}
				if (!isReadyRow(row)) {
					continue;
				}
				const outcome = await saveRowIfStillFree(queryClient, row, saveScope);
				outcomes.set(row.row, outcome);
				const savedSoFar = new Map(outcomes);
				setState((current) => ({ ...current, outcomes: savedSoFar }));
				if (outcome.kind === 'failed') {
					break;
				}
			}
			return outcomes;
		},
		[queryClient, saveScope]
	);

	const confirm = useCallback(async () => {
		const { sheet, rows: previewRows, stage } = state;
		if (stage !== 'preview' || !sheet) {
			return;
		}
		if (!previewRows.some(isReadyRow)) {
			return;
		}
		runRef.current += 1;
		const run = runRef.current;
		setState((current) => ({ ...current, stage: 'rechecking', hasCheckFailed: false, hasPreviewChanged: false }));
		let rows: TimeImportRow[];
		try {
			rows = await check(sheet);
		} catch (error) {
			logErrorInDev('Time import check before saving failed', error);
			if (runRef.current === run) {
				setState((current) => ({ ...current, stage: 'preview', hasCheckFailed: true }));
			}
			return;
		}
		if (runRef.current !== run) {
			return;
		}
		const isPreviewStillTrue = haveSameReadyRows(previewRows, rows);
		if (!isPreviewStillTrue) {
			setState((current) => ({ ...current, stage: 'preview', rows, hasPreviewChanged: true }));
			return;
		}
		setState((current) => ({ ...current, stage: 'importing', rows, outcomes: NO_OUTCOMES }));
		const outcomes = await saveRows(run, rows);
		invalidateTimesheetData();
		void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
		if (runRef.current === run) {
			setState((current) => ({ ...current, stage: 'done', outcomes }));
		}
	}, [check, invalidateTimesheetData, queryClient, saveRows, state]);

	const { stage, rows, outcomes } = state;
	const summary = useMemo(() => timeImportSummaryOf(rows), [rows]);
	const run = useMemo<TimeImportRun | null>(() => {
		if (stage === 'importing') {
			return { outcomes, isFinished: false };
		}
		if (stage === 'done') {
			return { outcomes, isFinished: true };
		}
		return null;
	}, [outcomes, stage]);
	const report = useMemo(() => {
		if (!run) {
			return null;
		}
		return timeImportReportOf(rows, run);
	}, [rows, run]);

	return {
		stage,
		fileName: state.fileName,
		fileProblem: state.fileProblem,
		ignoredHeaders: state.sheet?.ignoredHeaders ?? NO_HEADERS,
		/** The rows the file holds, known as soon as it is read and before any of them has a verdict. */
		fileRowCount: state.sheet?.rows.length ?? 0,
		rows,
		summary,
		run,
		report,
		hasCheckFailed: state.hasCheckFailed,
		hasPreviewChanged: state.hasPreviewChanged,
		chooseFile,
		retryCheck,
		confirm,
		reset
	};
}

export type TimeImport = ReturnType<typeof useTimeImport>;
