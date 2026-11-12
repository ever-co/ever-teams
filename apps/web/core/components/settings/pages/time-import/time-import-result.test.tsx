/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeImport } from '@/core/hooks/timesheet/use-time-import';
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

type MockMetric = { key: string; label: string; value: React.ReactNode };

type MockSegment = { value: string; label?: React.ReactNode; count?: number };

type MockSegmentedControlProps = {
	items: MockSegment[];
	onValueChange: (value: string) => void;
	ariaLabel: string;
};

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
	Spinner: () => null,
	Table: () => null
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
		<output>
			<p>{title}</p>
			<p>{description}</p>
		</output>
	)
}));
jest.mock('@/core/components/dashboards/kit/metric-strip', () => ({
	MetricStrip: ({ items }: { items: MockMetric[] }) => (
		<dl>
			{items.map((item) => (
				<div key={item.key} data-testid={`figure-${item.key}`}>
					{item.label}: {item.value}
				</div>
			))}
		</dl>
	)
}));
jest.mock('@/core/components/common/segmented-control', () => ({
	SegmentedControl: ({ items, onValueChange, ariaLabel }: MockSegmentedControlProps) => (
		<div role="tablist" aria-label={ariaLabel}>
			{items.map((item) => (
				<button key={item.value} type="button" role="tab" onClick={() => onValueChange(item.value)}>
					{item.label} {item.count}
				</button>
			))}
		</div>
	)
}));

import { useTimeImportCopy } from './time-import-copy';
import { TimeImportResult } from './time-import-result';

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
	projects: [{ id: 'project-website', name: 'Website' }],
	tasks: []
};

function sheetRowOf(row: number, cells: Partial<TimeImportCells>): TimeImportSheetRow {
	return {
		row,
		cells: {
			date: '2026-11-03',
			startTime: '09:00',
			endDate: '',
			endTime: '10:30',
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

function timeImportOf(rows: TimeImportRow[], overrides: Partial<TimeImport> = {}): TimeImport {
	return {
		stage: 'preview',
		fileName: 'october.csv',
		fileProblem: null,
		ignoredHeaders: [],
		fileRowCount: rows.length,
		columnsStep: null,
		canEditColumns: false,
		rows,
		summary: timeImportSummaryOf(rows),
		run: null,
		report: null,
		hasCheckFailed: false,
		hasPreviewChanged: false,
		chooseFile: jest.fn(),
		retryCheck: jest.fn(),
		chooseColumn: jest.fn(),
		chooseDateOrder: jest.fn(),
		confirmColumns: jest.fn(),
		editColumns: jest.fn(),
		confirm: jest.fn(),
		reset: jest.fn(),
		...overrides
	};
}

function Harness({
	timeImport,
	onDownloadReport
}: Readonly<{ timeImport: TimeImport; onDownloadReport?: () => void }>) {
	const copy = useTimeImportCopy();
	return <TimeImportResult timeImport={timeImport} copy={copy} onDownloadReport={onDownloadReport ?? jest.fn()} />;
}

const MARKUP = '<img src=x onerror=alert(1)>';

const MIXED_ROWS = rowsOf([
	sheetRowOf(2, { project: 'Website', notes: MARKUP, billable: 'yes' }),
	sheetRowOf(3, { project: '<b>Unknown</b>', startTime: '11:00', endTime: '12:00' }),
	sheetRowOf(4, { date: 'someday', startTime: '=HYPERLINK("http://x")' })
]);

describe('TimeImportResult', () => {
	it('lists every row with what becomes of it and why', () => {
		render(<Harness timeImport={timeImportOf(MIXED_ROWS)} />);

		const rows = screen.getAllByRole('listitem');
		expect(rows).toHaveLength(3);
		expect(rows[0].textContent).toContain('timeImport.row.NUMBER {"row":2}');
		expect(rows[0].textContent).toContain('timeImport.status.READY');
		expect(rows[0].textContent).toContain('1h 30m');
		expect(rows[0].textContent).toContain('Website');
		expect(rows[0].textContent).toContain('timeImport.row.BILLABLE');
		expect(rows[1].textContent).toContain('timeImport.status.LEFT_OUT');
		expect(rows[1].textContent).toContain('timeImport.problems.PROJECT_UNKNOWN');
		expect(rows[2].textContent).toContain('timeImport.problems.DATE_UNREADABLE');
		expect(rows[2].textContent).toContain('timeImport.problems.START_UNREADABLE');
		expect(screen.getByTestId('figure-ready').textContent).toContain('1');
		expect(screen.getByTestId('figure-leftOut').textContent).toContain('2');
		expect(screen.getByTestId('figure-time').textContent).toContain('1h 30m');
	});

	it('shows what the file holds as text, never as markup', () => {
		const { container } = render(<Harness timeImport={timeImportOf(MIXED_ROWS)} />);

		expect(screen.getByText(MARKUP, { exact: false })).toBeTruthy();
		expect(screen.getByText('<b>Unknown</b>', { exact: false })).toBeTruthy();
		expect(screen.getByText('=HYPERLINK("http://x")', { exact: false })).toBeTruthy();
		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('b')).toBeNull();
		expect(container.querySelector('a')).toBeNull();
	});

	it('imports only on the button that says how many entries it saves', () => {
		const timeImport = timeImportOf(MIXED_ROWS);
		render(<Harness timeImport={timeImport} />);

		expect(timeImport.confirm).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.IMPORT_ACTION {"count":1}' }));

		expect(timeImport.confirm).toHaveBeenCalledTimes(1);
	});

	it('goes back to the file choice on request', () => {
		const timeImport = timeImportOf(MIXED_ROWS);
		render(<Harness timeImport={timeImport} />);

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.CHOOSE_ANOTHER' }));

		expect(timeImport.reset).toHaveBeenCalledTimes(1);
	});

	it('offers no import when no row is ready, and says what to do', () => {
		const rows = rowsOf([sheetRowOf(2, { date: 'someday' })]);
		render(<Harness timeImport={timeImportOf(rows)} />);

		expect(screen.queryByRole('button', { name: /IMPORT_ACTION/ })).toBeNull();
		expect(screen.getByText('timeImport.NOTHING_READY')).toBeTruthy();
	});

	it('narrows the list to one status', () => {
		render(<Harness timeImport={timeImportOf(MIXED_ROWS)} />);

		fireEvent.click(screen.getByRole('tab', { name: /timeImport\.figures\.LEFT_OUT/ }));

		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});

	it('draws a long file fifty rows at a time', () => {
		const sheetRows = Array.from({ length: 60 }, (_, index) => sheetRowOf(index + 2, { date: 'someday' }));
		render(<Harness timeImport={timeImportOf(rowsOf(sheetRows))} />);

		expect(screen.getAllByRole('listitem')).toHaveLength(50);
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.SHOW_MORE {"count":10}' }));

		expect(screen.getAllByRole('listitem')).toHaveLength(60);
	});

	it('names the columns of the file it did not read', () => {
		render(<Harness timeImport={timeImportOf(MIXED_ROWS, { ignoredHeaders: ['client', 'tags'] })} />);

		expect(screen.getByText('timeImport.IGNORED_COLUMNS {"count":2,"columns":"client and tags"}')).toBeTruthy();
	});

	it('offers to change the columns of a file read through a choice of columns, and of no other', () => {
		const timeImport = timeImportOf(MIXED_ROWS, { canEditColumns: true });
		const { unmount } = render(<Harness timeImport={timeImport} />);

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.mapping.EDIT' }));
		expect(timeImport.editColumns).toHaveBeenCalledTimes(1);
		unmount();

		render(<Harness timeImport={timeImportOf(MIXED_ROWS)} />);
		expect(screen.queryByRole('button', { name: 'timeImport.mapping.EDIT' })).toBeNull();
	});

	it('tells that the preview changed when the last check before saving found something new', () => {
		render(<Harness timeImport={timeImportOf(MIXED_ROWS, { hasPreviewChanged: true })} />);

		expect(screen.getByText('timeImport.PREVIEW_CHANGED_TITLE')).toBeTruthy();
	});

	describe('once the import ran', () => {
		const rows = rowsOf([
			sheetRowOf(2, { startTime: '09:00', endTime: '10:00' }),
			sheetRowOf(3, { startTime: '10:00', endTime: '11:00' }),
			sheetRowOf(4, { startTime: '11:00', endTime: '12:00' }),
			sheetRowOf(5, { date: 'someday' })
		]);
		const outcomes = new Map<number, TimeImportOutcome>([
			[2, { kind: 'saved' }],
			[3, { kind: 'failed', reasonKey: 'toasts.REASONS.PERMISSION' }]
		]);
		const run: TimeImportRun = { outcomes, isFinished: true };
		const doneImport = (overrides: Partial<TimeImport> = {}) =>
			timeImportOf(rows, { stage: 'done', run, report: timeImportReportOf(rows, run), ...overrides });

		it('reports the row it stopped at with the reason, and what became of every row', () => {
			render(<Harness timeImport={doneImport()} />);

			expect(screen.getByText('timeImport.STOPPED_TITLE {"row":3}')).toBeTruthy();
			expect(
				screen.getByText(
					'toasts.REASONS.PERMISSION timeImport.STOPPED_SAVED {"count":1} timeImport.STOPPED_NOT_SENT {"count":1}'
				)
			).toBeTruthy();
			const statuses = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
			expect(statuses[0]).toContain('timeImport.status.SAVED');
			expect(statuses[1]).toContain('timeImport.status.FAILED');
			expect(statuses[1]).toContain('toasts.REASONS.PERMISSION');
			expect(statuses[2]).toContain('timeImport.status.NOT_SENT');
			expect(statuses[2]).toContain('timeImport.row.NOT_SENT_REASON {"row":3}');
			expect(statuses[3]).toContain('timeImport.status.LEFT_OUT');
			expect(screen.getByTestId('figure-saved').textContent).toContain('1');
			expect(screen.getByTestId('figure-failed').textContent).toContain('1');
			expect(screen.getByTestId('figure-notSent').textContent).toContain('1');
		});

		it('offers the report as a file and another import', () => {
			const onDownloadReport = jest.fn();
			const timeImport = doneImport();
			render(<Harness timeImport={timeImport} onDownloadReport={onDownloadReport} />);

			fireEvent.click(screen.getByRole('button', { name: 'timeImport.DOWNLOAD_REPORT' }));
			fireEvent.click(screen.getByRole('button', { name: 'timeImport.IMPORT_ANOTHER' }));

			expect(onDownloadReport).toHaveBeenCalledTimes(1);
			expect(timeImport.reset).toHaveBeenCalledTimes(1);
		});

		it('offers no change of columns once the import ran', () => {
			render(<Harness timeImport={doneImport({ canEditColumns: true })} />);

			expect(screen.queryByRole('button', { name: 'timeImport.mapping.EDIT' })).toBeNull();
		});

		it('says how much was saved when every ready row went through', () => {
			const allSaved = new Map<number, TimeImportOutcome>([
				[2, { kind: 'saved' }],
				[3, { kind: 'saved' }],
				[4, { kind: 'saved' }]
			]);
			const finished: TimeImportRun = { outcomes: allSaved, isFinished: true };
			render(<Harness timeImport={doneImport({ run: finished, report: timeImportReportOf(rows, finished) })} />);

			expect(screen.getByText('timeImport.DONE_TITLE {"count":3}')).toBeTruthy();
			expect(screen.getByText('timeImport.DONE_DESCRIPTION {"duration":"3h 0m"}')).toBeTruthy();
		});
	});

	it('shows how far the saving is while it runs, with no way to start it twice', () => {
		const rows = rowsOf([
			sheetRowOf(2, { startTime: '09:00', endTime: '10:00' }),
			sheetRowOf(3, { startTime: '10:00', endTime: '11:00' })
		]);
		const run: TimeImportRun = { outcomes: new Map([[2, { kind: 'saved' }]]), isFinished: false };
		render(
			<Harness
				timeImport={timeImportOf(rows, { stage: 'importing', run, report: timeImportReportOf(rows, run) })}
			/>
		);

		const progress = screen.getByRole('progressbar');
		expect(progress.getAttribute('aria-valuenow')).toBe('1');
		expect(progress.getAttribute('aria-valuemax')).toBe('2');
		expect(screen.queryByRole('button', { name: /IMPORT_ACTION/ })).toBeNull();
		expect(screen.queryByRole('button', { name: 'timeImport.CHOOSE_ANOTHER' })).toBeNull();
	});
});
