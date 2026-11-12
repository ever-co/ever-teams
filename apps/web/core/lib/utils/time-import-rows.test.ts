import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import {
	checkedRowsOf,
	draftRowsOf,
	haveSameReadyRows,
	isReadyRow,
	manualTimeRequestOf,
	rowStatusOf,
	timeImportLookupsOf,
	timeImportReportOf,
	timeImportSummaryOf,
	type TimeImportContext,
	type TimeImportOutcome,
	type TimeImportRecordedLog,
	type TimeImportRow
} from './time-import-rows';
import type { TimeImportCells, TimeImportSheetRow } from './time-import-sheet';

const HOUR = 3600;

/** A local time of Tuesday 3 November 2026, the day most rows of these tests are on. */
const at = (hours: number, minutes = 0, day = 3) => new Date(2026, 10, day, hours, minutes);

const NOW = at(18, 0, 5);

const VIEWER = { employeeId: 'employee-viewer', email: 'viewer@ever.co', name: 'Vera Viewer' };
const ADA = { employeeId: 'employee-ada', email: 'ada@ever.co', name: 'Ada Lovelace' };

const WEBSITE = { id: 'project-website', name: 'Website' };

const FIX_LOGIN = {
	id: 'task-fix-login',
	title: 'Fix login',
	projectId: WEBSITE.id,
	assigneeEmployeeIds: [VIEWER.employeeId]
};
const WRITE_DOCS = {
	id: 'task-write-docs',
	title: 'Write docs',
	projectId: null,
	assigneeEmployeeIds: [ADA.employeeId]
};

function contextOf(overrides: Partial<TimeImportContext> = {}): TimeImportContext {
	return {
		now: NOW,
		allowsFutureDates: false,
		requiresProject: false,
		teamHasDefaultProject: false,
		viewerEmployeeId: VIEWER.employeeId,
		viewerEmail: VIEWER.email,
		canImportForOthers: false,
		matchesEveryTeamTask: false,
		members: [VIEWER, ADA],
		projects: [WEBSITE],
		tasks: [FIX_LOGIN, WRITE_DOCS],
		...overrides
	};
}

function sheetRowOf(cells: Partial<TimeImportCells>, row = 2): TimeImportSheetRow {
	return {
		row,
		cells: {
			date: '2026-11-03',
			startTime: '09:00',
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

function draftOf(cells: Partial<TimeImportCells>, overrides: Partial<TimeImportContext> = {}): TimeImportRow {
	return draftRowsOf([sheetRowOf(cells)], contextOf(overrides))[0];
}

function problemCodesOf(row: TimeImportRow) {
	return row.problems.map((problem) => problem.code);
}

function recordedLog(id: string, start: Date, end: Date, taskId: string | null = null): TimeImportRecordedLog {
	return { id, startedAt: start.toISOString(), stoppedAt: end.toISOString(), isRunning: false, taskId };
}

function logsOn(day: number, employeeId: string, logs: TimeImportRecordedLog[]) {
	const dayKey = `2026-11-${String(day).padStart(2, '0')}`;
	return new Map([[`${employeeId}:${dayKey}`, logs]]);
}

const NO_LOGS = new Map<string, TimeImportRecordedLog[]>();

describe('draftRowsOf', () => {
	it('reads a row with an end time into an entry in the viewer own time zone', () => {
		const row = draftOf({ project: 'website', task: 'FIX LOGIN', notes: 'Pairing', billable: 'yes' });

		expect(row.problems).toEqual([]);
		expect(row.entry).toEqual({
			employeeId: VIEWER.employeeId,
			memberName: null,
			start: at(9),
			end: at(10, 30),
			seconds: 1.5 * HOUR,
			projectId: WEBSITE.id,
			projectName: 'Website',
			taskId: FIX_LOGIN.id,
			taskTitle: 'Fix login',
			notes: 'Pairing',
			isBillable: true
		});
		expect(isReadyRow(row)).toBe(true);
	});

	it('reads a row with a duration instead of an end time', () => {
		const row = draftOf({ endTime: '', duration: '1h 15m' });

		expect(row.entry?.end).toEqual(at(10, 15));
		expect(row.entry?.seconds).toBe(1.25 * HOUR);
	});

	it('lets a duration run past midnight', () => {
		const row = draftOf({ startTime: '22:00', endTime: '', duration: '4:00' });

		expect(row.entry?.end).toEqual(at(2, 0, 4));
	});

	it('saves a row without a project, a task, notes or a billable mark as plain, non-billable time', () => {
		const row = draftOf({});

		expect(row.entry).toMatchObject({ projectId: null, taskId: null, notes: '', isBillable: false });
	});

	it('tells every cell of the date and the times it cannot read', () => {
		const row = draftOf({ date: '03/11/2026', startTime: '9h', endTime: 'noon', duration: 'long' });

		expect(problemCodesOf(row)).toEqual([
			'dateUnreadable',
			'startUnreadable',
			'endUnreadable',
			'durationUnreadable'
		]);
		expect(row.entry).toBeNull();
	});

	it('leaves out a row with neither an end time nor a duration', () => {
		expect(problemCodesOf(draftOf({ endTime: '' }))).toEqual(['endMissing']);
	});

	it('leaves out a row that ends before it starts, or at the same minute', () => {
		expect(problemCodesOf(draftOf({ startTime: '10:30', endTime: '09:00' }))).toEqual(['endNotAfterStart']);
		expect(problemCodesOf(draftOf({ startTime: '09:00', endTime: '09:00' }))).toEqual(['endNotAfterStart']);
		expect(problemCodesOf(draftOf({ endTime: '', duration: '0:00' }))).toEqual(['endNotAfterStart']);
	});

	it('leaves out a row whose end time and duration disagree, and accepts one where they agree', () => {
		expect(problemCodesOf(draftOf({ duration: '2h' }))).toEqual(['durationMismatch']);
		expect(draftOf({ duration: '1:30' }).problems).toEqual([]);
	});

	it('leaves out a row longer than a day, which a bare number of minutes read as hours would be', () => {
		expect(problemCodesOf(draftOf({ date: '2026-10-20', endTime: '', duration: '90' }))).toEqual(['tooLong']);
		expect(draftOf({ endTime: '', duration: '24:00' }).problems).toEqual([]);
	});

	it('leaves out a row that ends after now when the organization refuses future time', () => {
		const future = { date: '2026-11-05', startTime: '17:30', endTime: '18:30' };

		expect(problemCodesOf(draftOf(future))).toEqual(['inFuture']);
		expect(draftOf(future, { allowsFutureDates: true }).problems).toEqual([]);
		expect(draftOf({ date: '2026-11-05', startTime: '17:00', endTime: '18:00' }).problems).toEqual([]);
	});

	it('leaves out a row whose billable cell is not a yes or a no', () => {
		expect(problemCodesOf(draftOf({ billable: 'maybe' }))).toEqual(['billableUnreadable']);
		expect(draftOf({ billable: 'No' }).entry?.isBillable).toBe(false);
	});

	it('leaves out a row whose project matches none, or more than one', () => {
		const twins = [WEBSITE, { id: 'project-website-2', name: 'WEBSITE' }];

		expect(problemCodesOf(draftOf({ project: 'Mobile app' }))).toEqual(['projectUnknown']);
		expect(draftOf({ project: 'Website' }, { projects: twins }).problems).toEqual([
			{ code: 'projectAmbiguous', count: 2 }
		]);
	});

	it('leaves out a row whose task matches none of the team', () => {
		expect(problemCodesOf(draftOf({ task: 'Ship it' }))).toEqual(['taskUnknown']);
	});

	it('leaves out a row whose task is another member own, for a viewer who is not a team manager', () => {
		expect(problemCodesOf(draftOf({ task: 'Write docs' }))).toEqual(['taskNotAssigned']);
		expect(draftOf({ task: 'Write docs' }, { matchesEveryTeamTask: true }).entry?.taskId).toBe(WRITE_DOCS.id);
	});

	it('leaves out a row whose task title is shared by several of the member tasks', () => {
		const twin = { ...FIX_LOGIN, id: 'task-fix-login-2', title: 'fix login' };

		expect(draftOf({ task: 'Fix login' }, { tasks: [FIX_LOGIN, twin] }).problems).toEqual([
			{ code: 'taskAmbiguous', count: 2 }
		]);
	});

	it('matches names with the same letters composed differently', () => {
		const composed = { id: 'project-cafe', name: 'Café' };

		expect(draftOf({ project: 'Café' }, { projects: [composed] }).entry?.projectId).toBe('project-cafe');
	});

	describe('when the organization requires a project', () => {
		const required = { requiresProject: true };

		it('leaves out a row with no project, no task project and no default project of the team', () => {
			expect(problemCodesOf(draftOf({}, required))).toEqual(['projectRequired']);
			expect(
				problemCodesOf(draftOf({ task: 'Write docs' }, { ...required, matchesEveryTeamTask: true }))
			).toEqual(['projectRequired']);
		});

		it('accepts a row the API can file under a project', () => {
			expect(draftOf({ project: 'Website' }, required).problems).toEqual([]);
			expect(draftOf({ task: 'Fix login' }, required).problems).toEqual([]);
			expect(draftOf({}, { ...required, teamHasDefaultProject: true }).problems).toEqual([]);
		});
	});

	describe('whose time a row is', () => {
		it('is the viewer own when the row names no member, or names the viewer', () => {
			expect(draftOf({}).entry?.employeeId).toBe(VIEWER.employeeId);
			expect(draftOf({ memberEmail: 'Viewer@Ever.co' }).entry?.employeeId).toBe(VIEWER.employeeId);
		});

		it('never becomes the viewer own time when the row names someone else', () => {
			const row = draftOf({ memberEmail: ADA.email });

			expect(problemCodesOf(row)).toEqual(['memberNotAllowed']);
			expect(row.entry).toBeNull();
		});

		it('is the named member for a viewer the API lets add time for others', () => {
			const row = draftOf({ memberEmail: 'ADA@ever.co', task: 'Write docs' }, { canImportForOthers: true });

			expect(row.problems).toEqual([]);
			expect(row.entry).toMatchObject({
				employeeId: ADA.employeeId,
				memberName: 'Ada Lovelace',
				taskId: WRITE_DOCS.id
			});
		});

		it('is left out when the email matches no member of the team', () => {
			const row = draftOf({ memberEmail: 'nobody@ever.co' }, { canImportForOthers: true });

			expect(problemCodesOf(row)).toEqual(['memberUnknown']);
		});

		it('is left out when the viewer has no employee record to hold their own time', () => {
			expect(problemCodesOf(draftOf({}, { viewerEmployeeId: null }))).toEqual(['noOwnMember']);
		});
	});

	it('judges nothing else on a row with more cells than the header', () => {
		const sheetRow = { ...sheetRowOf({ billable: 'then deployed' }), extraCellCount: 1 };
		const [row] = draftRowsOf([sheetRow], contextOf());

		expect(row.problems).toEqual([{ code: 'extraCells' }]);
	});
});

describe('timeImportLookupsOf', () => {
	it('asks once per member and day, the whole day in the viewer time zone', () => {
		const context = contextOf({ canImportForOthers: true, matchesEveryTeamTask: true });
		const rows = draftRowsOf(
			[
				sheetRowOf({ startTime: '09:00', endTime: '10:00' }, 2),
				sheetRowOf({ startTime: '14:00', endTime: '15:00' }, 3),
				sheetRowOf({ date: '2026-11-04' }, 4),
				sheetRowOf({ memberEmail: ADA.email }, 5)
			],
			context
		);

		expect(timeImportLookupsOf(rows)).toEqual([
			{ key: 'employee-viewer:2026-11-03', employeeId: VIEWER.employeeId, start: at(0), end: at(0, 0, 4) },
			{ key: 'employee-viewer:2026-11-04', employeeId: VIEWER.employeeId, start: at(0, 0, 4), end: at(0, 0, 5) },
			{ key: 'employee-ada:2026-11-03', employeeId: ADA.employeeId, start: at(0), end: at(0, 0, 4) }
		]);
	});

	it('asks for both days of an entry that runs past midnight, and only one when it ends at midnight', () => {
		const pastMidnight = draftRowsOf(
			[sheetRowOf({ startTime: '23:00', endTime: '', duration: '2h' })],
			contextOf()
		);
		const untilMidnight = draftRowsOf(
			[sheetRowOf({ startTime: '23:00', endTime: '', duration: '1h' })],
			contextOf()
		);

		expect(timeImportLookupsOf(pastMidnight).map((lookup) => lookup.key)).toEqual([
			'employee-viewer:2026-11-03',
			'employee-viewer:2026-11-04'
		]);
		expect(timeImportLookupsOf(untilMidnight).map((lookup) => lookup.key)).toEqual(['employee-viewer:2026-11-03']);
	});

	it('asks nothing for a row that is already left out', () => {
		const rows = draftRowsOf([sheetRowOf({ date: 'someday' })], contextOf());

		expect(timeImportLookupsOf(rows)).toEqual([]);
	});
});

describe('checkedRowsOf', () => {
	const morning = () => draftRowsOf([sheetRowOf({ task: 'Fix login' })], contextOf());

	it('keeps a row ready when the member has nothing recorded on its time', () => {
		const logs = logsOn(3, VIEWER.employeeId, [
			recordedLog('before', at(7), at(9)),
			recordedLog('after', at(10, 30), at(12))
		]);
		const [row] = checkedRowsOf({ rows: morning(), logsByLookup: logs, now: NOW });

		expect(row.problems).toEqual([]);
	});

	it('leaves out a row that shares any time with a recorded entry, since saving it would remove that entry whole', () => {
		const tracked = recordedLog('tracked', at(10, 15), at(12, 9));
		const [row] = checkedRowsOf({
			rows: morning(),
			logsByLookup: logsOn(3, VIEWER.employeeId, [tracked]),
			now: NOW
		});

		expect(row.problems).toEqual([{ code: 'overlapsRecorded', count: 1, start: at(10, 15), end: at(12, 9) }]);
		expect(isReadyRow(row)).toBe(false);
		expect(row.entry).not.toBeNull();
	});

	it('counts every recorded entry the row overlaps and shows the first one', () => {
		const logs = [recordedLog('second', at(10), at(11)), recordedLog('first', at(8), at(9, 30))];
		const [row] = checkedRowsOf({ rows: morning(), logsByLookup: logsOn(3, VIEWER.employeeId, logs), now: NOW });

		expect(row.problems).toEqual([{ code: 'overlapsRecorded', count: 2, start: at(8), end: at(9, 30) }]);
	});

	it('tells a row that is already recorded: same member, start, end and task', () => {
		const same = recordedLog('same', at(9), at(10, 30), FIX_LOGIN.id);
		const [row] = checkedRowsOf({ rows: morning(), logsByLookup: logsOn(3, VIEWER.employeeId, [same]), now: NOW });

		expect(row.problems).toEqual([{ code: 'alreadyRecorded' }]);
	});

	it('reads the same times on another task as an overlap, not as the same entry', () => {
		const otherTask = recordedLog('other', at(9), at(10, 30), WRITE_DOCS.id);
		const [row] = checkedRowsOf({
			rows: morning(),
			logsByLookup: logsOn(3, VIEWER.employeeId, [otherTask]),
			now: NOW
		});

		expect(problemCodesOf(row)).toEqual(['overlapsRecorded']);
	});

	it('leaves out a row that overlaps a row above it, and keeps the first one', () => {
		const rows = draftRowsOf(
			[
				sheetRowOf({ startTime: '09:00', endTime: '10:30' }, 2),
				sheetRowOf({ startTime: '10:00', endTime: '11:00' }, 3),
				sheetRowOf({ startTime: '10:30', endTime: '11:30' }, 4)
			],
			contextOf()
		);
		const checked = checkedRowsOf({ rows, logsByLookup: NO_LOGS, now: NOW });

		expect(checked.map((row) => row.problems)).toEqual([[], [{ code: 'overlapsRow', row: 2 }], []]);
	});

	it('tells a row that repeats a row above it', () => {
		const rows = draftRowsOf([sheetRowOf({}, 2), sheetRowOf({}, 3)], contextOf());
		const checked = checkedRowsOf({ rows, logsByLookup: NO_LOGS, now: NOW });

		expect(checked[1].problems).toEqual([{ code: 'sameAsRow', row: 2 }]);
	});

	it('does not hold a row against a row above it that is itself left out', () => {
		const rows = draftRowsOf([sheetRowOf({ task: 'Ship it' }, 2), sheetRowOf({}, 3)], contextOf());
		const checked = checkedRowsOf({ rows, logsByLookup: NO_LOGS, now: NOW });

		expect(problemCodesOf(checked[0])).toEqual(['taskUnknown']);
		expect(checked[1].problems).toEqual([]);
	});

	it('does not hold a row against one left out for an overlap with recorded time', () => {
		const rows = draftRowsOf(
			[
				sheetRowOf({ startTime: '09:00', endTime: '10:30' }, 2),
				sheetRowOf({ startTime: '10:00', endTime: '11:00' }, 3)
			],
			contextOf()
		);
		const early = recordedLog('early', at(8), at(9, 30));
		const checked = checkedRowsOf({ rows, logsByLookup: logsOn(3, VIEWER.employeeId, [early]), now: NOW });

		expect(problemCodesOf(checked[0])).toEqual(['overlapsRecorded']);
		expect(checked[1].problems).toEqual([]);
	});

	it('lets two members have time at the same hours', () => {
		const context = contextOf({ canImportForOthers: true });
		const rows = draftRowsOf([sheetRowOf({}, 2), sheetRowOf({ memberEmail: ADA.email }, 3)], context);
		const checked = checkedRowsOf({ rows, logsByLookup: NO_LOGS, now: NOW });

		expect(checked.every(isReadyRow)).toBe(true);
	});

	it('reads the recorded time of both days for an entry that runs past midnight', () => {
		const rows = draftRowsOf([sheetRowOf({ startTime: '23:00', endTime: '', duration: '2h' })], contextOf());
		const nextMorning = recordedLog('night', at(0, 30, 4), at(2, 0, 4));
		const [row] = checkedRowsOf({ rows, logsByLookup: logsOn(4, VIEWER.employeeId, [nextMorning]), now: NOW });

		expect(problemCodesOf(row)).toEqual(['overlapsRecorded']);
	});
});

describe('the figures of a file', () => {
	const rows = draftRowsOf(
		[
			sheetRowOf({ startTime: '09:00', endTime: '10:30' }, 2),
			sheetRowOf({ startTime: '11:00', endTime: '', duration: '0:45' }, 3),
			sheetRowOf({ date: 'someday' }, 4),
			sheetRowOf({ startTime: '13:00', endTime: '14:00' }, 5)
		],
		contextOf()
	);

	it('counts the ready rows, the rows left out and the time the ready rows add', () => {
		expect(timeImportSummaryOf(rows)).toEqual({
			rowCount: 4,
			readyCount: 3,
			leftOutCount: 1,
			readySeconds: 3.25 * HOUR
		});
	});

	it('tells whether two checks of a file import the same rows', () => {
		const tracked = recordedLog('tracked', at(13, 30), at(15));
		const changed = checkedRowsOf({ rows, logsByLookup: logsOn(3, VIEWER.employeeId, [tracked]), now: NOW });

		expect(haveSameReadyRows(rows, checkedRowsOf({ rows, logsByLookup: NO_LOGS, now: NOW }))).toBe(true);
		expect(haveSameReadyRows(rows, changed)).toBe(false);
	});

	it('reports a run that stopped at a refusal: saved, left out, failed and never sent', () => {
		const outcomes = new Map<number, TimeImportOutcome>([
			[2, { kind: 'saved' }],
			[3, { kind: 'failed', reasonKey: 'toasts.REASONS.PERMISSION' }]
		]);
		const run = { outcomes, isFinished: true };

		expect(rows.map((row) => rowStatusOf(row, run))).toEqual(['saved', 'failed', 'leftOut', 'notSent']);
		expect(timeImportReportOf(rows, run)).toEqual({
			savedCount: 1,
			savedSeconds: 1.5 * HOUR,
			leftOutCount: 1,
			failedCount: 1,
			notSentCount: 1,
			refusal: { row: 3, reasonKey: 'toasts.REASONS.PERMISSION' }
		});
	});

	it('reports a run that saved every ready row', () => {
		const outcomes = new Map<number, TimeImportOutcome>([
			[2, { kind: 'saved' }],
			[3, { kind: 'saved' }],
			[5, { kind: 'saved' }]
		]);

		expect(timeImportReportOf(rows, { outcomes, isFinished: true })).toEqual({
			savedCount: 3,
			savedSeconds: 3.25 * HOUR,
			leftOutCount: 1,
			failedCount: 0,
			notSentCount: 0,
			refusal: null
		});
	});

	it('shows a row as ready before the run, and while it waits for its turn', () => {
		const running = { outcomes: new Map<number, TimeImportOutcome>([[2, { kind: 'saved' }]]), isFinished: false };

		expect(rows.map((row) => rowStatusOf(row, null))).toEqual(['ready', 'ready', 'leftOut', 'ready']);
		expect(rows.map((row) => rowStatusOf(row, running))).toEqual(['saved', 'ready', 'leftOut', 'ready']);
	});
});

describe('manualTimeRequestOf', () => {
	const scope = { tenantId: 'tenant-a', organizationId: 'organization-a', organizationTeamId: 'team-a' };

	it('builds the body of the manual time call for the row member, team, project and task', () => {
		const row = draftOf({ project: 'Website', task: 'Fix login', notes: 'Pairing', billable: 'yes' });
		if (!isReadyRow(row)) {
			throw new Error('The row should be ready');
		}

		expect(manualTimeRequestOf(row.entry, scope)).toEqual({
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			organizationTeamId: 'team-a',
			employeeId: VIEWER.employeeId,
			startedAt: at(9),
			stoppedAt: at(10, 30),
			description: 'Pairing',
			isBillable: true,
			logType: ETimeLogType.MANUAL,
			source: ETimeLogSource.BROWSER,
			projectId: WEBSITE.id,
			taskId: FIX_LOGIN.id
		});
	});

	it('names no project and no task when the row has none', () => {
		const row = draftOf({});
		if (!isReadyRow(row)) {
			throw new Error('The row should be ready');
		}
		const request = manualTimeRequestOf(row.entry, scope);

		expect(request).not.toHaveProperty('projectId');
		expect(request).not.toHaveProperty('taskId');
	});
});
