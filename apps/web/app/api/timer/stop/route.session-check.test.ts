/**
 * #5684: the routes of this server share one session check per token for a few seconds, and that check answers the
 * user with the employee's tracking flag. Pressing Start on another task stops the run, then reads the user again: the
 * read got the check made before the stop, still tracking, so the app took the flag for stuck, stopped again (406) and
 * refused the start. A stop forgets the check kept for its token, so the next read is the user as the stop left them.
 */
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { sessionChecks } from '@/core/services/server/guards/authenticated-guard-app';
import { GET as readUser } from '../../user/me/route';
import { POST as stopTimer } from './route';

/** Gauzy as these routes reach it: the employee's tracking flag, and how many times the user was read. */
const gauzy = { isTrackingTime: true, isRunning: true, userReads: 0 };

const COOKIE = `${TOKEN_COOKIE_NAME}=token-1; ${TENANT_ID_COOKIE_NAME}=tenant-1`;
const originalFetch = global.fetch;

function gauzyAnswer(input: RequestInfo | URL): Response {
	const path = new URL(String(input)).pathname;
	if (path.endsWith('/user/me')) {
		gauzy.userReads += 1;
		return Response.json({
			id: 'user-1',
			tenantId: 'tenant-1',
			employee: { id: 'employee-1', isTrackingTime: gauzy.isTrackingTime }
		});
	}
	if (path.endsWith('/timesheet/timer/stop')) {
		if (!gauzy.isRunning) {
			return Response.json({ statusCode: 406, message: 'No running log found.' }, { status: 406 });
		}
		gauzy.isRunning = false;
		gauzy.isTrackingTime = false;
		return Response.json({ id: 'log-1', isRunning: false });
	}
	if (path.endsWith('/timesheet/timer/status')) {
		return Response.json({ running: gauzy.isRunning, lastLog: { id: 'log-1', isRunning: gauzy.isRunning } });
	}
	return Response.json({ message: 'Not Found' }, { status: 404 });
}

const userRead = () => readUser(new Request('http://localhost:3030/api/user/me', { headers: { cookie: COOKIE } }));

const stopRequest = () =>
	stopTimer(
		new Request('http://localhost:3030/api/timer/stop', {
			method: 'POST',
			headers: { cookie: COOKIE },
			body: JSON.stringify({ source: 'TEAMS' })
		})
	);

async function trackingFlagOf(response: Response): Promise<boolean | undefined> {
	const user = (await response.json()) as { employee?: { isTrackingTime?: boolean } };
	return user.employee?.isTrackingTime;
}

describe('the user read right after a stop through this server', () => {
	beforeEach(() => {
		sessionChecks.clear();
		gauzy.isTrackingTime = true;
		gauzy.isRunning = true;
		gauzy.userReads = 0;
		global.fetch = jest.fn(async (input: RequestInfo | URL) => gauzyAnswer(input)) as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('answers the employee as the stop left them, no longer tracking', async () => {
		// The timer runs: a route reads the user, which this server keeps for the routes of the next few seconds
		expect(await trackingFlagOf(await userRead())).toBe(true);

		const stop = await stopRequest();
		expect(stop.status).toBe(200);

		expect(await trackingFlagOf(await userRead())).toBe(false);
	});

	it('still forgets the check when Gauzy had no run left to stop', async () => {
		await userRead();
		// Another device stopped the run meanwhile: its flag is off, and this stop is answered 406
		gauzy.isRunning = false;
		gauzy.isTrackingTime = false;

		const stop = await stopRequest();
		expect(stop.status).toBe(406);

		expect(await trackingFlagOf(await userRead())).toBe(false);
	});

	it('still shares one check between the routes that follow the stop', async () => {
		await stopRequest();
		const readsAfterStop = gauzy.userReads;

		await userRead();
		await userRead();

		expect(gauzy.userReads - readsAfterStop).toBeLessThanOrEqual(1);
	});
});
