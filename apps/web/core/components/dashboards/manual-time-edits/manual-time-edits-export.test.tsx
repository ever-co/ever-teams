/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

import type { CsvColumn } from '@/core/lib/utils/dashboard-export';
import type { EditsFigures, EditsGroup, ManualTimeEntry } from '@/core/lib/utils/dashboards/manual-time-edits';
import type { TimeLogHistoryChange } from '@/core/lib/utils/time-log-history';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import type { EntriesPdfContent } from '@/core/components/dashboards/kit/entries-pdf';

const mockBuildPdf = jest.fn();
const mockDownloadCsv = jest.fn();
let mockLocale: WorkspaceLocale = { tag: 'en', dateFormat: null, numberFormat: null };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({ useWorkspaceLocale: () => mockLocale }));
jest.mock('@/core/lib/utils/dashboard-export', () => ({
	...jest.requireActual('@/core/lib/utils/dashboard-export'),
	downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
	downloadPdf: async (buildDocument: () => Promise<unknown>) => {
		await buildDocument();
	}
}));
jest.mock('@/core/components/dashboards/kit/entries-pdf', () => ({
	buildEntriesPdf: (content: unknown) => mockBuildPdf(content)
}));

import { useManualTimeEditsExportOptions } from './manual-time-edits-export';

const DATE_COLUMN = 0;
const EDITED_AT_COLUMN = 8;
const BEFORE_COLUMN = 9;
const AFTER_COLUMN = 10;

const NOVEMBER_4 = new Date(2026, 10, 4);

const entry = {
	key: 'log-a',
	day: NOVEMBER_4,
	dayKey: '2026-11-04',
	memberName: 'Ada',
	projectName: 'Website',
	taskTitle: 'Header',
	start: new Date(2026, 10, 4, 9, 0),
	end: new Date(2026, 10, 4, 10, 30),
	seconds: 5400,
	isAdded: true,
	isEdited: true,
	editedAt: new Date(2026, 10, 5, 9, 7),
	isBillable: true,
	status: null,
	reason: 'Forgot the timer',
	isDeleted: false,
	changeKinds: [],
	lastChange: null
} as unknown as ManualTimeEntry;

const groups: EditsGroup[] = [{ key: '2026-11-04', day: NOVEMBER_4, member: null, entries: [entry], seconds: 5400 }];

const figures: EditsFigures = {
	entryCount: 1,
	manualSeconds: 5400,
	addedCount: 1,
	addedSeconds: 5400,
	editedCount: 1,
	editedSeconds: 5400,
	memberCount: 1,
	deletedCount: 0
};

const period = { from: NOVEMBER_4, to: new Date(2026, 10, 10) };

async function runExport(key: 'pdf' | 'csv') {
	const { result } = renderHook(() =>
		useManualTimeEditsExportOptions({ groups, figures, period, teamName: 'Core', members: [] })
	);
	const option = result.current.find((candidate) => candidate.key === key);
	await option?.run();
}

async function pdfRowCells(): Promise<string[]> {
	await runExport('pdf');
	const content = mockBuildPdf.mock.calls[0][0] as EntriesPdfContent;
	return content.groups[0].rows[0].cells;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockLocale = { tag: 'en', dateFormat: null, numberFormat: null };
});

describe('the dates of a line of the Manual time edit PDF', () => {
	it("follow the workspace's date format, as the period above them does", async () => {
		mockLocale = { tag: 'en', dateFormat: 'DD/MM/YYYY', numberFormat: null };

		const cells = await pdfRowCells();

		expect(cells[DATE_COLUMN]).toBe('04/11/2026');
		expect(cells[EDITED_AT_COLUMN]).toBe('05/11/2026 09:07');
	});

	it('stay as they were for a workspace that chose no date format', async () => {
		const cells = await pdfRowCells();

		expect(cells[DATE_COLUMN]).toBe('2026-11-04');
		expect(cells[EDITED_AT_COLUMN]).toBe('2026-11-05 09:07');
	});
});

describe('the before and after of a line of the Manual time edit exports', () => {
	const lastChange: TimeLogHistoryChange = {
		id: 'change',
		entryId: 'log-a',
		at: new Date(2026, 10, 5, 9, 7),
		action: 'updated',
		authorEmployeeId: null,
		authorUserId: null,
		ownerEmployeeId: null,
		reason: 'Forgot to stop',
		fields: [
			{
				field: 'stoppedAt',
				before: new Date(2026, 10, 4, 10, 0).toISOString(),
				after: new Date(2026, 10, 4, 10, 30).toISOString(),
				beforeName: null,
				afterName: null
			},
			{ field: 'duration', before: 3600, after: 5400, beforeName: null, afterName: null }
		]
	};

	it('carry the values of the last edit, a start or an end with its day', async () => {
		await runExport('csv');

		const columns = mockDownloadCsv.mock.calls[0][1] as CsvColumn<ManualTimeEntry>[];
		const edited = { ...entry, lastChange };
		expect(columns[BEFORE_COLUMN].header).toBe('dashboard.manualTimeEdits.COLUMN_BEFORE');
		expect(columns[BEFORE_COLUMN].valueOf(edited)).toBe(
			'dashboard.timesheets.COLUMNS.END 2026-11-04 10:00; dashboard.timesheets.COLUMNS.DURATION 1:00'
		);
		expect(columns[AFTER_COLUMN].valueOf(edited)).toBe(
			'dashboard.timesheets.COLUMNS.END 2026-11-04 10:30; dashboard.timesheets.COLUMNS.DURATION 1:30'
		);
	});

	it('say a deleted entry was deleted, and nothing for an entry without kept values', async () => {
		await runExport('csv');

		const columns = mockDownloadCsv.mock.calls[0][1] as CsvColumn<ManualTimeEntry>[];
		const deleted = { ...entry, isDeleted: true, lastChange: { ...lastChange, action: 'deleted' as const } };
		expect(columns[AFTER_COLUMN].valueOf(deleted)).toBe('dashboard.manualTimeEdits.DELETED');
		expect(columns[BEFORE_COLUMN].valueOf(entry)).toBe('');
		expect(columns[AFTER_COLUMN].valueOf(entry)).toBe('');
	});

	it('fit the PDF page: one width a column', async () => {
		await runExport('pdf');

		const content = mockBuildPdf.mock.calls[0][0] as EntriesPdfContent;
		expect(content.columnWidths).toHaveLength(content.columns.length);
	});
});

describe('the dates of a line of the Manual time edit CSV', () => {
	it('stay data a spreadsheet can sort, whatever the date format', async () => {
		mockLocale = { tag: 'en', dateFormat: 'DD/MM/YYYY', numberFormat: null };

		await runExport('csv');

		const columns = mockDownloadCsv.mock.calls[0][1] as CsvColumn<ManualTimeEntry>[];
		expect(columns[DATE_COLUMN].valueOf(entry)).toBe('2026-11-04');
		expect(columns[EDITED_AT_COLUMN].valueOf(entry)).toBe('2026-11-05 09:07');
	});
});
