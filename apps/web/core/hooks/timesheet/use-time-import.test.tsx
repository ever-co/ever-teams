/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'node:util';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { TimeImportContext } from '@/core/lib/utils/time-import-rows';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import { ZodValidationError } from '@/core/types/schemas';

// The hook reads the file's bytes as UTF-8; jsdom has no TextDecoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockGetTimeLogConflicts = jest.fn();
const mockAddManualTime = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		addManualTime: (request: unknown) => mockAddManualTime(request)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
jest.mock('@/core/lib/helpers/timer-errors', () => ({
	requiredTrackingFieldsOf: (error: { fields?: string[] }) => error.fields ?? null
}));

import { useTimeImport } from './use-time-import';

const VIEWER_ID = 'employee-viewer';

const HEADER = 'date,start time,end time,task,notes,billable';

/** A local time of Tuesday 5 March 2024: a day in the past whatever the clock of the machine says. */
const at = (hours: number, minutes = 0, day = 5) => new Date(2024, 2, day, hours, minutes);

function contextAt(now: Date): TimeImportContext {
	return {
		now,
		allowsFutureDates: false,
		requiresProject: false,
		teamHasDefaultProject: false,
		viewerEmployeeId: VIEWER_ID,
		viewerEmail: 'viewer@ever.co',
		canImportForOthers: false,
		matchesEveryTeamTask: false,
		members: [],
		projects: [],
		tasks: [{ id: 'task-fix-login', title: 'Fix login', projectId: null, assigneeEmployeeIds: [VIEWER_ID] }]
	};
}

const saveScope = { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-a' };

function textFile(text: string, name = 'march.csv') {
	const bytes = new TextEncoder().encode(text);
	return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
}

function csvFile(lines: string[], name = 'march.csv') {
	return textFile([HEADER, ...lines].join('\n'), name);
}

function recordedLog(id: string, start: Date, end: Date) {
	return { id, startedAt: start.toISOString(), stoppedAt: end.toISOString(), isRunning: false, taskId: null };
}

function renderImport() {
	const client = new QueryClient();
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useTimeImport({ contextAt, saveScope }), { wrapper });
}

const THREE_ROWS = [
	'2024-03-05,09:00,10:00,Fix login,Pairing,yes',
	'2024-03-05,11:00,12:00,,,',
	'2024-03-06,09:00,09:30,,,'
];

beforeEach(() => {
	mockGetTimeLogConflicts.mockResolvedValue([]);
	mockAddManualTime.mockResolvedValue({});
	window.localStorage.clear();
});

describe('useTimeImport', () => {
	it('refuses a file that is not CSV without reading it', async () => {
		const { result } = renderImport();
		const arrayBuffer = jest.fn();

		await act(() => result.current.chooseFile({ name: 'march.xlsx', size: 120, arrayBuffer }));

		expect(result.current.stage).toBe('idle');
		expect(result.current.fileProblem).toEqual({ code: 'notCsv' });
		expect(arrayBuffer).not.toHaveBeenCalled();
		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();
	});

	it('refuses a file whose bytes are not UTF-8 text', async () => {
		const { result } = renderImport();
		const bytes = Uint8Array.from([0xff, 0xfe, 0x41, 0x00]);
		const file = {
			name: 'march.csv',
			size: bytes.byteLength,
			arrayBuffer: async () => bytes.buffer as ArrayBuffer
		};

		await act(() => result.current.chooseFile(file));

		expect(result.current.fileProblem).toEqual({ code: 'notText' });
		expect(result.current.stage).toBe('idle');
	});

	it('refuses a file the import cannot use, with the reason', async () => {
		const { result } = renderImport();
		const bytes = new TextEncoder().encode('project,task\nWebsite,Fix login\n');
		const file = {
			name: 'march.csv',
			size: bytes.byteLength,
			arrayBuffer: async () => bytes.buffer as ArrayBuffer
		};

		await act(() => result.current.chooseFile(file));

		expect(result.current.fileProblem).toEqual({
			code: 'missingColumns',
			columns: ['date', 'startTime', 'endOrDuration']
		});
	});

	it('previews a file after one read of recorded time per day, and saves nothing', async () => {
		const { result } = renderImport();

		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		expect(result.current.stage).toBe('preview');
		expect(result.current.fileName).toBe('march.csv');
		expect(result.current.summary).toEqual({ rowCount: 3, readyCount: 3, leftOutCount: 0, readySeconds: 9000 });
		expect(mockGetTimeLogConflicts.mock.calls.map(([lookup]) => lookup)).toEqual([
			{ employeeId: VIEWER_ID, startDate: at(0), endDate: at(0, 0, 6) },
			{ employeeId: VIEWER_ID, startDate: at(0, 0, 6), endDate: at(0, 0, 7) }
		]);
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});

	it('leaves out a row that overlaps recorded time and never saves it', async () => {
		mockGetTimeLogConflicts.mockImplementation(({ startDate }: { startDate: Date }) => {
			const isFirstDay = startDate.getTime() === at(0).getTime();
			if (isFirstDay) {
				return Promise.resolve([recordedLog('tracked', at(11, 30), at(13))]);
			}
			return Promise.resolve([]);
		});
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		expect(result.current.rows.map((row) => row.problems.map((problem) => problem.code))).toEqual([
			[],
			['overlapsRecorded'],
			[]
		]);

		await act(() => result.current.confirm());

		expect(result.current.stage).toBe('done');
		expect(mockAddManualTime.mock.calls.map(([request]) => request.startedAt)).toEqual([at(9), at(9, 0, 6)]);
		expect(result.current.report).toMatchObject({
			savedCount: 2,
			leftOutCount: 1,
			failedCount: 0,
			notSentCount: 0
		});
	});

	it('saves the ready rows one after the other with the fields of the manual time call', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		await act(() => result.current.confirm());

		expect(mockAddManualTime).toHaveBeenCalledTimes(3);
		expect(mockAddManualTime.mock.calls[0][0]).toEqual({
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			organizationTeamId: 'team-a',
			employeeId: VIEWER_ID,
			startedAt: at(9),
			stoppedAt: at(10),
			description: 'Pairing',
			isBillable: true,
			taskId: 'task-fix-login',
			logType: ETimeLogType.MANUAL,
			source: ETimeLogSource.BROWSER
		});
		expect(result.current.report).toEqual({
			savedCount: 3,
			savedSeconds: 9000,
			leftOutCount: 0,
			failedCount: 0,
			notSentCount: 0,
			refusal: null
		});
	});

	it('stops at the first refusal and reports what was saved, what failed and what was never sent', async () => {
		mockAddManualTime.mockResolvedValueOnce({}).mockRejectedValueOnce({ statusCode: 403 });
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		await act(() => result.current.confirm());

		expect(mockAddManualTime).toHaveBeenCalledTimes(2);
		expect(result.current.stage).toBe('done');
		expect(result.current.report).toEqual({
			savedCount: 1,
			savedSeconds: 3600,
			leftOutCount: 0,
			failedCount: 1,
			notSentCount: 1,
			refusal: { row: 3, reasonKey: 'toasts.REASONS.PERMISSION' }
		});
	});

	it('names the missing project when the organization refuses an entry without one', async () => {
		mockAddManualTime.mockRejectedValueOnce({ statusCode: 400, fields: ['projectId'] });
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		await act(() => result.current.confirm());

		expect(result.current.report?.refusal).toEqual({ row: 2, reasonKey: 'timeImport.problems.PROJECT_REQUIRED' });
	});

	it('counts a row as saved when the API saved it and only its answer has an unexpected shape', async () => {
		mockAddManualTime.mockRejectedValueOnce(new ZodValidationError('addManualTime API response', []));
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		await act(() => result.current.confirm());

		expect(mockAddManualTime).toHaveBeenCalledTimes(3);
		expect(result.current.report).toMatchObject({ savedCount: 3, failedCount: 0, refusal: null });
	});

	it('says so when recorded time cannot be read, and checks again on request', async () => {
		mockGetTimeLogConflicts.mockRejectedValueOnce(new Error('network'));
		const { result } = renderImport();

		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		expect(result.current.stage).toBe('checking');
		expect(result.current.hasCheckFailed).toBe(true);
		expect(result.current.rows).toEqual([]);

		act(() => result.current.retryCheck());

		await waitFor(() => expect(result.current.stage).toBe('preview'));
		expect(result.current.hasCheckFailed).toBe(false);
		expect(result.current.summary.readyCount).toBe(3);
	});

	it.each([
		['no start', { id: 'broken', startedAt: null, stoppedAt: at(13).toISOString(), isRunning: false }],
		['a start that is not a date', { id: 'broken', startedAt: 'soon', stoppedAt: at(13).toISOString() }],
		['no end though it is stopped', { id: 'broken', startedAt: at(11, 30).toISOString(), isRunning: false }]
	])('previews no row when a recorded entry comes back with %s', async (_label, unreadableLog) => {
		mockGetTimeLogConflicts.mockResolvedValue([unreadableLog]);
		const { result } = renderImport();

		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		expect(result.current.stage).toBe('checking');
		expect(result.current.hasCheckFailed).toBe(true);
		expect(result.current.rows).toEqual([]);
	});

	it('saves nothing when the last check before saving reads an entry whose time cannot be read', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		mockGetTimeLogConflicts.mockResolvedValue([{ id: 'broken', startedAt: null, isRunning: false }]);

		await act(() => result.current.confirm());

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(result.current.stage).toBe('preview');
		expect(result.current.hasCheckFailed).toBe(true);
	});

	it('checks the file once more before saving, and saves nothing when a row is no longer ready', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		mockGetTimeLogConflicts.mockResolvedValue([recordedLog('added-since', at(9, 30), at(9, 45))]);

		await act(() => result.current.confirm());

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(result.current.stage).toBe('preview');
		expect(result.current.hasPreviewChanged).toBe(true);
		expect(result.current.summary.readyCount).toBe(2);
	});

	it('stops at a row whose time was recorded while the rows before it were being saved', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		mockAddManualTime.mockImplementationOnce(async () => {
			mockGetTimeLogConflicts.mockResolvedValue([recordedLog('added-meanwhile', at(11, 15), at(11, 45))]);
			return {};
		});

		await act(() => result.current.confirm());

		expect(mockAddManualTime).toHaveBeenCalledTimes(1);
		expect(result.current.stage).toBe('done');
		expect(result.current.report).toEqual({
			savedCount: 1,
			savedSeconds: 3600,
			leftOutCount: 0,
			failedCount: 1,
			notSentCount: 1,
			refusal: { row: 3, reasonKey: 'timeImport.problems.RECORDED_MEANWHILE' }
		});
	});

	it('sends no row once the page is left while the day of that row is read again', async () => {
		let answerRead: (logs: unknown[]) => void = () => undefined;
		const { result, unmount } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		// The two days of the check before saving, then the first row's day, which waits until the page is left
		mockGetTimeLogConflicts
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([])
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						answerRead = resolve;
					})
			);

		let confirming: Promise<void> = Promise.resolve();
		act(() => {
			confirming = result.current.confirm();
		});
		await waitFor(() => expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(5));
		unmount();
		answerRead([]);
		await confirming;

		expect(mockAddManualTime).not.toHaveBeenCalled();
	});

	it('sends no row whose day cannot be read again right before it is saved', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		mockAddManualTime.mockImplementationOnce(async () => {
			mockGetTimeLogConflicts.mockRejectedValue({ statusCode: 503 });
			return {};
		});

		await act(() => result.current.confirm());

		expect(mockAddManualTime).toHaveBeenCalledTimes(1);
		expect(result.current.report).toMatchObject({
			savedCount: 1,
			failedCount: 1,
			notSentCount: 1,
			refusal: { row: 3, reasonKey: 'toasts.REASONS.SERVER' }
		});
	});

	it('saves nothing when the last check before saving fails', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));
		mockGetTimeLogConflicts.mockRejectedValue(new Error('network'));

		await act(() => result.current.confirm());

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(result.current.stage).toBe('preview');
		expect(result.current.hasCheckFailed).toBe(true);
	});

	it('goes back to an empty start on reset', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		act(() => result.current.reset());

		expect(result.current.stage).toBe('idle');
		expect(result.current.rows).toEqual([]);
		expect(result.current.fileName).toBe('');
	});
});

describe('useTimeImport for a file from another tool', () => {
	const EXPORT = 'Datum,Beginn,Ende,Notiz\n05/03/2024,09:00,10:00,Pairing\n06/03/2024,09:00,09:30,\n';

	type Rendered = ReturnType<typeof renderImport>['result'];

	function chooseExportColumns(result: Rendered) {
		act(() => {
			result.current.chooseColumn('date', 0);
			result.current.chooseColumn('startTime', 1);
			result.current.chooseColumn('endTime', 2);
			result.current.chooseColumn('notes', 3);
		});
		act(() => result.current.chooseDateOrder('dayFirst'));
	}

	it('stops on the Columns step, then checks the rows once the columns and the date format are chosen', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(textFile(EXPORT)));

		expect(result.current.stage).toBe('columns');
		expect(result.current.columnsStep?.blocker).toBe('missing');
		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();

		act(() => {
			result.current.chooseColumn('date', 0);
			result.current.chooseColumn('startTime', 1);
			result.current.chooseColumn('endTime', 2);
		});
		expect(result.current.columnsStep?.blocker).toBe('dateOrder');

		chooseExportColumns(result);
		await act(() => result.current.confirmColumns());

		expect(result.current.stage).toBe('preview');
		expect(result.current.canEditColumns).toBe(true);
		expect(result.current.summary).toMatchObject({ rowCount: 2, readyCount: 2 });
		expect(result.current.rows[0].entry).toMatchObject({ start: at(9), end: at(10), notes: 'Pairing' });
		expect(result.current.rows[1].row).toBe(3);
	});

	it('keeps the columns chosen for the next file of the same headers on this browser', async () => {
		const first = renderImport();
		await act(() => first.result.current.chooseFile(textFile(EXPORT)));
		chooseExportColumns(first.result);
		await act(() => first.result.current.confirmColumns());

		const second = renderImport();
		await act(() => second.result.current.chooseFile(textFile(EXPORT, 'april.csv')));

		expect(second.result.current.stage).toBe('preview');
		expect(second.result.current.summary.readyCount).toBe(2);
	});

	it('still imports when the browser refuses its storage, and asks again next time', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		const { result } = renderImport();
		await act(() => result.current.chooseFile(textFile(EXPORT)));
		chooseExportColumns(result);
		await act(() => result.current.confirmColumns());

		expect(result.current.stage).toBe('preview');
		await act(() => result.current.chooseFile(textFile(EXPORT, 'april.csv')));
		expect(result.current.stage).toBe('columns');

		getItem.mockRestore();
		setItem.mockRestore();
		consoleError.mockRestore();
	});

	it('reads a file with the usual headers of a time export straight to its preview, and back to its columns', async () => {
		const { result } = renderImport();
		await act(() =>
			result.current.chooseFile(textFile('Start date,Start time,End time\n2024-03-05,09:00,10:00\n'))
		);

		expect(result.current.stage).toBe('preview');
		expect(result.current.canEditColumns).toBe(true);
		act(() => result.current.editColumns());

		expect(result.current.stage).toBe('columns');
		expect(result.current.rows).toEqual([]);
		expect(result.current.columnsStep?.fields.find((item) => item.field === 'date')?.columnIndex).toBe(0);
	});

	it('reads the template straight to its preview, with no columns to change', async () => {
		const { result } = renderImport();
		await act(() => result.current.chooseFile(csvFile(THREE_ROWS)));

		expect(result.current.canEditColumns).toBe(false);
		act(() => result.current.editColumns());

		expect(result.current.stage).toBe('preview');
	});

	it('refuses a file whose dates are written two ways, with the row that shows it', async () => {
		const { result } = renderImport();
		await act(() =>
			result.current.chooseFile(textFile('Date,Start,End\n25/02/2024,09:00,10:00\n02/25/2024,09:00,10:00\n'))
		);

		expect(result.current.stage).toBe('idle');
		expect(result.current.fileProblem).toEqual({
			code: 'mixedDates',
			firstRow: 2,
			firstValue: '25/02/2024',
			row: 3,
			value: '02/25/2024'
		});
	});
});
