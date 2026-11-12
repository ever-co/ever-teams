/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeImport } from '@/core/hooks/timesheet/use-time-import';
import type { TimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import type { CsvColumn } from '@/core/lib/utils/dashboard-export';
import type { TimeImportReportLine } from '@/core/lib/utils/time-import-report';
import {
	checkedRowsOf,
	draftRowsOf,
	timeImportReportOf,
	timeImportSummaryOf,
	type TimeImportContext,
	type TimeImportOutcome,
	type TimeImportRow,
	type TimeImportRun
} from '@/core/lib/utils/time-import-rows';
import type { TimeImportCells, TimeImportSheetRow } from '@/core/lib/utils/time-import-sheet';

type MockNoticeProps = { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode };

const mockAccess = jest.fn();
const mockTimeImport = jest.fn();
const mockDownloadCsv = jest.fn();

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));
jest.mock('@/core/components/icons', () => ({
	Alert: () => null,
	CircleAlert: () => null,
	Download: () => null,
	FileCsv: () => null,
	Lock: () => null,
	Spinner: () => null,
	Upload: () => null
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description, actions }: MockNoticeProps) => (
		<output>
			<p>{title}</p>
			<p>{description}</p>
			{actions}
		</output>
	)
}));
jest.mock('@/core/components/dashboards/kit/metric-strip', () => ({ MetricStrip: () => null }));
jest.mock('@/core/components/common/segmented-control', () => ({ SegmentedControl: () => null }));
jest.mock('@/core/components/settings/kit/team-settings-gate', () => ({
	TeamSettingsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('@/core/hooks/timesheet/use-time-import-access', () => ({
	useTimeImportAccess: () => mockAccess()
}));
jest.mock('@/core/hooks/timesheet/use-time-import', () => ({
	useTimeImport: () => mockTimeImport()
}));
jest.mock('@/core/lib/utils/dashboard-export', () => ({
	...jest.requireActual('@/core/lib/utils/dashboard-export'),
	downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args)
}));

import { TimeImportSettingsPage } from './time-import-settings-page';

const NOW = new Date(2026, 10, 5, 18, 0);

const CONTEXT: TimeImportContext = {
	now: NOW,
	allowsFutureDates: false,
	requiresProject: false,
	teamHasDefaultProject: false,
	viewerEmployeeId: 'employee-viewer',
	viewerEmail: 'viewer@ever.co',
	canImportForOthers: false,
	matchesEveryTeamTask: false,
	members: [],
	projects: [],
	tasks: []
};

function accessOf(overrides: Partial<TimeImportAccess> = {}): TimeImportAccess {
	return {
		isLoading: false,
		hasLoadFailed: false,
		retryLoad: jest.fn(),
		refusal: null,
		canImportForOthers: false,
		matchesEveryTeamTask: false,
		teamName: 'Team A',
		organizationName: 'Acme',
		contextAt: () => CONTEXT,
		saveScope: { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-a' },
		...overrides
	};
}

function sheetRowOf(row: number, cells: Partial<TimeImportCells>): TimeImportSheetRow {
	return {
		row,
		cells: {
			date: '2026-11-03',
			startTime: '09:00',
			endDate: '',
			endTime: '10:00',
			duration: '',
			project: '',
			task: '',
			notes: '',
			billable: '',
			memberEmail: '',
			...cells
		},
		extraCellCount: 0
	};
}

function rowsOf(sheetRows: TimeImportSheetRow[]): TimeImportRow[] {
	const drafts = draftRowsOf(sheetRows, CONTEXT);
	return checkedRowsOf({ rows: drafts, logsByLookup: new Map(), now: NOW });
}

function timeImportOf(overrides: Partial<TimeImport> = {}): TimeImport {
	const rows = overrides.rows ?? [];
	return {
		stage: 'idle',
		fileName: '',
		fileProblem: null,
		ignoredHeaders: [],
		fileRowCount: rows.length,
		rows,
		summary: timeImportSummaryOf(rows),
		run: null,
		report: null,
		hasCheckFailed: false,
		hasPreviewChanged: false,
		chooseFile: jest.fn(),
		retryCheck: jest.fn(),
		confirm: jest.fn(),
		reset: jest.fn(),
		...overrides
	};
}

function headersOf(columns: ReadonlyArray<CsvColumn<never>>) {
	return columns.map((column) => column.header);
}

beforeEach(() => {
	mockAccess.mockReturnValue(accessOf());
	mockTimeImport.mockReturnValue(timeImportOf());
});

describe('TimeImportSettingsPage', () => {
	it('shows the place to drop a file and the columns to a viewer who may add manual time', () => {
		render(<TimeImportSettingsPage />);

		expect(screen.getByRole('heading', { level: 1, name: 'settings.entries.import.TITLE' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeTruthy();
		expect(screen.getByText('timeImport.SECTION_DESCRIPTION {"team":"Team A"}')).toBeTruthy();
		expect(screen.getByRole('heading', { name: 'timeImport.COLUMNS_TITLE' })).toBeTruthy();
		expect(screen.queryByText('member email')).toBeNull();
	});

	it('explains the member email column to a viewer who may add time for someone else', () => {
		mockAccess.mockReturnValue(accessOf({ canImportForOthers: true }));
		render(<TimeImportSettingsPage />);

		expect(screen.getByText('member email')).toBeTruthy();
	});

	it('says that manual time is off in the organization, and offers no file to drop', () => {
		mockAccess.mockReturnValue(accessOf({ refusal: 'manualTimeOff' }));
		render(<TimeImportSettingsPage />);

		expect(screen.getByText('timeImport.access.MANUAL_TIME_OFF_TITLE')).toBeTruthy();
		expect(screen.getByText('timeImport.access.MANUAL_TIME_OFF_DESCRIPTION {"organization":"Acme"}')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeNull();
	});

	it('says that the viewer role cannot add manual time, and offers no file to drop', () => {
		mockAccess.mockReturnValue(accessOf({ refusal: 'noPermission' }));
		render(<TimeImportSettingsPage />);

		expect(screen.getByText('timeImport.access.NO_PERMISSION_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeNull();
	});

	it('says that it could not get ready, with a way to try again', () => {
		const retryLoad = jest.fn();
		mockAccess.mockReturnValue(accessOf({ hasLoadFailed: true, retryLoad }));
		render(<TimeImportSettingsPage />);

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.RETRY' }));

		expect(screen.getByText('timeImport.access.LOAD_FAILED_TITLE')).toBeTruthy();
		expect(retryLoad).toHaveBeenCalledTimes(1);
	});

	it('waits on its skeleton until permissions, rules and tasks are known', () => {
		mockAccess.mockReturnValue(accessOf({ isLoading: true }));
		render(<TimeImportSettingsPage />);

		expect(screen.queryByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeNull();
		expect(screen.getByRole('heading', { level: 1, name: 'settings.entries.import.TITLE' })).toBeTruthy();
	});

	it('keeps a file on screen while the team data reloads behind it', () => {
		const rows = rowsOf([sheetRowOf(2, {})]);
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'preview', fileName: 'october.csv', rows }));
		const { rerender } = render(<TimeImportSettingsPage />);
		expect(screen.getAllByRole('listitem')).toHaveLength(1);

		mockAccess.mockReturnValue(accessOf({ isLoading: true }));
		rerender(<TimeImportSettingsPage />);

		expect(screen.getAllByRole('listitem')).toHaveLength(1);
	});

	it.each([
		['manualTimeOff', 'timeImport.access.MANUAL_TIME_OFF_TITLE'],
		['noPermission', 'timeImport.access.NO_PERMISSION_TITLE']
	] as const)('closes a file on screen once the access is refused (%s)', (refusal, noticeTitle) => {
		const rows = rowsOf([sheetRowOf(2, {})]);
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'preview', fileName: 'october.csv', rows }));
		const { rerender } = render(<TimeImportSettingsPage />);
		expect(screen.getByRole('button', { name: 'timeImport.IMPORT_ACTION {"count":1}' })).toBeTruthy();

		mockAccess.mockReturnValue(accessOf({ refusal }));
		rerender(<TimeImportSettingsPage />);

		expect(screen.getByText(noticeTitle)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'timeImport.IMPORT_ACTION {"count":1}' })).toBeNull();
		expect(screen.queryAllByRole('listitem')).toHaveLength(0);
	});

	it('does not bring a refused import back while the team data reloads', () => {
		const rows = rowsOf([sheetRowOf(2, {})]);
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'preview', fileName: 'october.csv', rows }));
		const { rerender } = render(<TimeImportSettingsPage />);
		mockAccess.mockReturnValue(accessOf({ refusal: 'noPermission' }));
		rerender(<TimeImportSettingsPage />);

		mockAccess.mockReturnValue(accessOf({ refusal: 'noPermission', isLoading: true }));
		rerender(<TimeImportSettingsPage />);

		expect(screen.queryAllByRole('listitem')).toHaveLength(0);
		expect(screen.queryByRole('button', { name: 'timeImport.IMPORT_ACTION {"count":1}' })).toBeNull();
	});

	it('starts over when the active team changes', () => {
		const { rerender } = render(<TimeImportSettingsPage />);
		expect(screen.getByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeTruthy();

		const otherTeam = { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-b' };
		mockAccess.mockReturnValue(accessOf({ isLoading: true, saveScope: otherTeam }));
		rerender(<TimeImportSettingsPage />);

		expect(screen.queryByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeNull();
	});

	it('hands a chosen file to the import', () => {
		const chooseFile = jest.fn();
		mockTimeImport.mockReturnValue(timeImportOf({ chooseFile }));
		render(<TimeImportSettingsPage />);
		const file = new File(['date,start time,end time\n'], 'october.csv', { type: 'text/csv' });

		fireEvent.change(screen.getByTestId('time-import-file'), { target: { files: [file] } });

		expect(chooseFile).toHaveBeenCalledWith(file);
	});

	it('shows the file being checked, then its rows', () => {
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'checking', fileName: 'october.csv', fileRowCount: 12 }));
		const { rerender } = render(<TimeImportSettingsPage />);
		expect(screen.getByText('timeImport.CHECKING_TITLE {"fileName":"october.csv"}')).toBeTruthy();
		expect(screen.getByText('timeImport.CHECKING_DESCRIPTION {"count":12}')).toBeTruthy();

		const rows = rowsOf([sheetRowOf(2, {}), sheetRowOf(3, { date: 'someday' })]);
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'preview', fileName: 'october.csv', rows }));
		rerender(<TimeImportSettingsPage />);

		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'timeImport.IMPORT_ACTION {"count":1}' })).toBeTruthy();
	});

	it('downloads the template with the columns the viewer may fill in', () => {
		const { rerender } = render(<TimeImportSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.TEMPLATE_DOWNLOAD' }));

		mockAccess.mockReturnValue(accessOf({ canImportForOthers: true }));
		rerender(<TimeImportSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.TEMPLATE_DOWNLOAD' }));

		const [ownRows, ownColumns, ownFileName] = mockDownloadCsv.mock.calls[0];
		const [, managerColumns] = mockDownloadCsv.mock.calls[1];
		expect(ownRows).toEqual([]);
		expect(ownFileName).toBe('time-import-template.csv');
		expect(headersOf(ownColumns)).toEqual([
			'date',
			'start time',
			'end time',
			'duration',
			'project',
			'task',
			'notes',
			'billable'
		]);
		expect(headersOf(managerColumns).at(-1)).toBe('member email');
	});

	it('downloads the report with what became of every row and why', () => {
		const rows = rowsOf([
			sheetRowOf(2, { startTime: '09:00', endTime: '10:00', notes: '=cmd' }),
			sheetRowOf(3, { startTime: '10:00', endTime: '11:00' }),
			sheetRowOf(4, { startTime: '11:00', endTime: '12:00' }),
			sheetRowOf(5, { date: 'someday' })
		]);
		const outcomes = new Map<number, TimeImportOutcome>([
			[2, { kind: 'saved' }],
			[3, { kind: 'failed', reasonKey: 'toasts.REASONS.PERMISSION' }]
		]);
		const run: TimeImportRun = { outcomes, isFinished: true };
		const report = timeImportReportOf(rows, run);
		mockTimeImport.mockReturnValue(timeImportOf({ stage: 'done', fileName: 'october.csv', rows, run, report }));
		render(<TimeImportSettingsPage />);

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.DOWNLOAD_REPORT' }));

		const [lines, columns, fileName] = mockDownloadCsv.mock.calls[0] as [
			TimeImportReportLine[],
			CsvColumn<never>[],
			string
		];
		expect(fileName).toMatch(/^time-import-report-\d{4}-\d{2}-\d{2}\.csv$/);
		expect(headersOf(columns)).toEqual([
			'row',
			'date',
			'start time',
			'end time',
			'duration',
			'project',
			'task',
			'notes',
			'billable',
			'status',
			'reason'
		]);
		const [savedLine, failedLine, notSentLine, leftOutLine] = lines;
		expect(lines).toHaveLength(4);
		expect(savedLine).toMatchObject({ row: 2, status: 'timeImport.status.SAVED', reason: '' });
		expect(failedLine).toMatchObject({
			row: 3,
			status: 'timeImport.status.FAILED',
			reason: 'toasts.REASONS.PERMISSION'
		});
		expect(notSentLine).toMatchObject({
			row: 4,
			status: 'timeImport.status.NOT_SENT',
			reason: 'timeImport.row.NOT_SENT_REASON {"row":3}'
		});
		expect(leftOutLine).toMatchObject({ row: 5, status: 'timeImport.status.LEFT_OUT' });
		expect(leftOutLine.reason).toContain('timeImport.problems.DATE_UNREADABLE');
		expect(savedLine.cells.notes).toBe('=cmd');
	});
});
