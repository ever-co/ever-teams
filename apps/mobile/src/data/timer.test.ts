import { serverFetch } from '../../app/services/client/fetch';
import { ApiError, dayBounds, readEmployeeId, readTimerStatus, readTrackedTotals, weekBounds } from './timer';

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
