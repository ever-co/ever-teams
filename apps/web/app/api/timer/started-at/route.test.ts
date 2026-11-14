/**
 * Proxy mode twin of Gauzy's `PUT /timesheet/timer/started-at`, which moves the start of the caller's running timer.
 * It first reads the session's own role permissions and is refused here, before Gauzy is asked to change anything,
 * unless the role runs the timer and may change tracked time.
 */
import { gauzyUrl, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { PUT as moveTimerStart } from './route';

const ORIGIN = 'https://app.ever.team';

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ permission, enabled: true }));
}

function gauzyAnswersInOrder(...answers: Response[]) {
	const fetchMock = jest.fn();
	for (const answer of answers) {
		fetchMock.mockResolvedValueOnce(answer);
	}
	global.fetch = fetchMock;
	return fetchMock;
}

function callOf(fetchMock: jest.Mock, index: number) {
	const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
	return { url, method: init.method, body: init.body };
}

const move = { startedAt: '2026-11-16T08:00:00.000Z', reason: 'Forgot to start timer' };

afterEach(restoreFetch);

describe('PUT /api/timer/started-at', () => {
	it('forwards the new start to a role that runs the timer and may change tracked time', async () => {
		const fetchMock = gauzyAnswersInOrder(
			jsonAnswer(permissionRows(['TIME_TRACKER', 'ALLOW_MODIFY_TIME'])),
			jsonAnswer({ id: 'log-1', startedAt: move.startedAt, isRunning: true })
		);
		const request = signedInRequest(`${ORIGIN}/api/timer/started-at`, 'PUT', move);

		const response = await moveTimerStart(request);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(callOf(fetchMock, 0).url).toBe(gauzyUrl('/role-permissions/me'));
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/timesheet/timer/started-at'));
		expect(callOf(fetchMock, 1).method).toBe('PUT');
		expect(JSON.parse(String(callOf(fetchMock, 1).body))).toEqual(move);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'log-1', startedAt: move.startedAt, isRunning: true });
	});

	it("passes Gauzy's refusal and its reason code through, as direct mode would see them", async () => {
		const refusal = { message: 'The new start overlaps another of your time entries.', code: 'TIMER_START_OVERLAP' };
		gauzyAnswersInOrder(jsonAnswer(permissionRows(['TIME_TRACKER', 'ALLOW_MODIFY_TIME'])), jsonAnswer(refusal, 409));
		const request = signedInRequest(`${ORIGIN}/api/timer/started-at`, 'PUT', move);

		const response = await moveTimerStart(request);

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it.each([
		['a role that runs the timer but may not change tracked time', ['TIME_TRACKER', 'ALLOW_MANUAL_TIME']],
		['a role that may change tracked time but does not run the timer', ['ALLOW_MODIFY_TIME']]
	])('refuses %s without asking Gauzy to change anything', async (_role, permissions) => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(permissions)));
		const request = signedInRequest(`${ORIGIN}/api/timer/started-at`, 'PUT', move);

		const response = await moveTimerStart(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not count a permission the role holds switched off', async () => {
		const rows = [
			{ permission: 'TIME_TRACKER', enabled: true },
			{ permission: 'ALLOW_MODIFY_TIME', enabled: false }
		];
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(rows));
		const request = signedInRequest(`${ORIGIN}/api/timer/started-at`, 'PUT', move);

		const response = await moveTimerStart(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
