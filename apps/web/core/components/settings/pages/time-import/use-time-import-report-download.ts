'use client';

import { useCallback } from 'react';
import type { TimeImport } from '@/core/hooks/timesheet/use-time-import';
import { downloadCsv } from '@/core/lib/utils/dashboard-export';
import {
	timeImportReportCsvColumnsOf,
	timeImportReportFileNameOf,
	type TimeImportReportLine
} from '@/core/lib/utils/time-import-report';
import { rowStatusOf } from '@/core/lib/utils/time-import-rows';
import type { TimeImportCopy } from './time-import-copy';

const REASON_SEPARATOR = ' ';

function reportLinesOf(timeImport: TimeImport, copy: TimeImportCopy): TimeImportReportLine[] {
	const { rows, run, report } = timeImport;
	const refusedRow = report?.refusal?.row ?? null;
	return rows.map((row) => {
		const status = rowStatusOf(row, run);
		const reasons = copy.reasonsOf(row, run, refusedRow);
		return {
			row: row.row,
			cells: row.cells,
			status: copy.statusLabel(status),
			reason: reasons.join(REASON_SEPARATOR)
		};
	});
}

/** Downloads the rows of an import with what became of each one, as a CSV. */
export function useTimeImportReportDownload(timeImport: TimeImport, copy: TimeImportCopy, canImportForOthers: boolean) {
	return useCallback(() => {
		const namesMembers = timeImport.rows.some((row) => row.cells.memberEmail !== '');
		const givesEndDates = timeImport.rows.some((row) => row.cells.endDate !== '');
		const columns = timeImportReportCsvColumnsOf(canImportForOthers || namesMembers, givesEndDates);
		const fileName = timeImportReportFileNameOf(new Date());
		downloadCsv(reportLinesOf(timeImport, copy), columns, fileName);
	}, [canImportForOthers, copy, timeImport]);
}
