import { serverFetch } from '../../app/services/client/fetch';
import { TimerSource } from '../../app/services/interfaces/ITimer';
import {
	ApiError,
	dayBounds,
	readEmployeeId,
	readLastLogOfAnyDay,
	readTask,
	readTimerStatus,
	readTrackedTotals,
	startTimer,
	stopTimer,
	weekBounds
} from './timer';

jest.mock('../../app/services/client/fetch', () => ({ serverFetch: jest.fn() }));

const session = { accessToken: 'access', tenantId: 'tenant', organizationId: 'organization' };
// Wednesday 18 November 2026, 9:05 in the person's own time
const wednesday = new Date(2026, 10, 18, 9, 5);

function answers(status: number, data: unknown) {
	(serverFetch as jest.Mock).mockResolvedValue({ data, response: { ok: status < 400, status } });
}

function requestSent(): { path: string; method: string; body?: Record<string, unknown>; tenantId?: string } {
	return (serverFetch as jest.Mock).mock.calls[0][0];
}

function queryOf(path: string): URLSearchParams {
	return new URLSearchParams(path.split('?')[1]);
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('the day and the week', () => {
	it("run from midnight to the end of the day, in the person's own time", () => {
		const { start, end } = dayBounds(wednesday);

		expect(start).toEqual(new Date(2026, 10, 18, 0, 0, 0, 0));
		expect(end).toEqual(new Date(2026, 10, 18, 23, 59, 59, 999));
	});

	it('starts the week on Monday', () => {
		expect(weekBounds(wednesday).start).toEqual(new Date(2026, 10, 16, 0, 0, 0, 0));
		expect(weekBounds(new Date(2026, 10, 16, 8)).start).toEqual(new Date(2026, 10, 16, 0, 0, 0, 0));
	});

	it('keeps Sunday in the week that began the Monday before', () => {
		const sunday = new Date(2026, 10, 22, 20);

		expect(weekBounds(sunday)).toEqual({
			start: new Date(2026, 10, 16, 0, 0, 0, 0),
			end: new Date(2026, 10, 22, 23, 59, 59, 999)
		});
	});
});

describe('the timer status', () => {
	it("is read for the person's own day, as the web reads it", async () => {
		answers(200, { duration: 6740, running: false });

		await expect(readTimerStatus(session, wednesday)).resolves.toEqual({ duration: 6740, running: false });

		const { path, tenantId } = requestSent();
		const query = queryOf(path);
		expect(path.startsWith('/timesheet/timer/status?')).toBe(true);
		expect(tenantId).toBe('tenant');
		expect(query.get('organizationId')).toBe('organization');
		expect(query.get('todayStart')).toBe(new Date(2026, 10, 18, 0, 0, 0, 0).toISOString());
		expect(query.get('todayEnd')).toBe(new Date(2026, 10, 18, 23, 59, 59, 999).toISOString());
	});

	it('fails with the status of a refusal, never reads its body as a status', async () => {
		answers(500, { message: 'Internal server error' });

		await expect(readTimerStatus(session, wednesday)).rejects.toEqual(new ApiError(500));
	});
});

describe('the totals', () => {
	it("are the person's own, for the week so far", async () => {
		answers(200, { weekDuration: 25763, todayDuration: 6758 });

		await expect(readTrackedTotals(session, 'employee-kofi', wednesday)).resolves.toEqual({
			weekDuration: 25763,
			todayDuration: 6758
		});

		const query = queryOf(requestSent().path);
		expect(requestSent().path.startsWith('/timesheet/statistics/counts?')).toBe(true);
		expect(query.get('employeeIds[0]')).toBe('employee-kofi');
		expect(query.get('startDate')).toBe(new Date(2026, 10, 16, 0, 0, 0, 0).toISOString());
	});
});

describe('the employee', () => {
	it('is read with the person', async () => {
		answers(200, { id: 'user', employee: { id: 'employee-kofi' } });

		await expect(readEmployeeId(session)).resolves.toBe('employee-kofi');
		expect(queryOf(requestSent().path).get('relations[0]')).toBe('employee');
	});

	it('is none for a person who is no employee here', async () => {
		answers(200, { id: 'user', employee: null });

		await expect(readEmployeeId(session)).resolves.toBeNull();
	});
});

describe('the last log of any day', () => {
	it('is the employee\x27s, read across days', async () => {
		const yesterday = { startedAt: '2026-11-17T15:00:00.000Z', taskId: 'task-har-1' };
		answers(200, [{ duration: 0, running: false, lastLog: yesterday }]);

		await expect(readLastLogOfAnyDay(session, 'employee-kofi')).resolves.toEqual(yesterday);
		const { path } = requestSent();
		expect(path.startsWith('/timesheet/timer/status/worked?')).toBe(true);
		expect(queryOf(path).get('employeeId')).toBe('employee-kofi');
	});

	it('is none for someone who never tracked time', async () => {
		answers(200, []);

		await expect(readLastLogOfAnyDay(session, 'employee-kofi')).resolves.toBeNull();
	});
});

describe('the task of the last log', () => {
	it('is read with its number and title', async () => {
		answers(200, { id: 'task-har-3', taskNumber: 'HAR-3', title: 'Repaint maintenance hatch', members: [] });

		await expect(readTask(session, 'task-har-3')).resolves.toEqual({
			taskNumber: 'HAR-3',
			title: 'Repaint maintenance hatch'
		});
		expect(requestSent().path.startsWith('/tasks/task-har-3?')).toBe(true);
	});
});

describe('start and stop', () => {
	it('start a tracked log from the phone, on the task and team it continues', async () => {
		answers(200, {});

		await startTimer(session, { taskId: 'task-har-3', organizationTeamId: 'team-field' });

		expect(requestSent()).toMatchObject({
			path: '/timesheet/timer/start',
			method: 'POST',
			body: {
				taskId: 'task-har-3',
				organizationTeamId: 'team-field',
				logType: 'TRACKED',
				source: TimerSource.MOBILE,
				tenantId: 'tenant',
				organizationId: 'organization'
			}
		});
	});

	it('start without a team when the log it continues had none', async () => {
		answers(200, {});

		await startTimer(session, { taskId: 'task-har-3', organizationTeamId: null });

		expect(requestSent().body).not.toHaveProperty('organizationTeamId');
	});

	it('stop with the source of the running log, so a timer started on the web stops too', async () => {
		answers(200, {});

		await stopTimer(session, {
			startedAt: '2026-11-18T08:00:00.000Z',
			source: TimerSource.BROWSER,
			taskId: 'task'
		});

		expect(requestSent()).toMatchObject({ path: '/timesheet/timer/stop', body: { source: TimerSource.BROWSER } });
	});

	it('take a stop that finds nothing running as done: another device stopped it', async () => {
		answers(406, { message: 'No running log found' });

		await expect(stopTimer(session, undefined)).resolves.toBeUndefined();
	});

	it('fail a stop the API refuses: the timer goes on there', async () => {
		answers(403, { message: 'Forbidden' });

		await expect(stopTimer(session, undefined)).rejects.toEqual(new ApiError(403));
	});
});
