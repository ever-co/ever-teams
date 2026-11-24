/**
 * #5728: the routes of this server share one session check per token for a few seconds, and that check answers the
 * user. Marta saves another time zone in Preferences, and the app reads the user again right away: the read got the
 * check made before the save, so the row kept showing the zone just replaced until a reload. A saved profile forgets
 * the check kept for its token, so the next read is the user as the save left them.
 */
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { sessionChecks } from '@/core/services/server/guards/authenticated-guard-app';
import { GET as readUser } from '../me/route';
import { PUT as updateUser } from './route';

/** Gauzy as these routes reach it: the time zone it holds, whether it takes a save, and how often the user was read. */
const gauzy = { timeZone: 'Europe/Berlin', refusesSaves: false, userReads: 0 };

const COOKIE = `${TOKEN_COOKIE_NAME}=token-1; ${TENANT_ID_COOKIE_NAME}=tenant-1`;
const ORIGIN = 'http://localhost:3030';
const originalFetch = global.fetch;

async function gauzyAnswer(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	const path = new URL(String(input)).pathname;
	if (path.endsWith('/user/me')) {
		gauzy.userReads += 1;
		return Response.json({ id: 'user-1', tenantId: 'tenant-1', timeZone: gauzy.timeZone });
	}
	const isSave = path.endsWith('/user/user-1') && init?.method === 'PUT';
	if (isSave && gauzy.refusesSaves) {
		return Response.json({ statusCode: 400, message: 'Bad Request' }, { status: 400 });
	}
	if (isSave) {
		const saved = JSON.parse(String(init?.body)) as { timeZone: string };
		gauzy.timeZone = saved.timeZone;
		return Response.json({ id: 'user-1', timeZone: gauzy.timeZone });
	}
	return Response.json({ message: 'Not Found' }, { status: 404 });
}

const userRead = () => readUser(new Request(`${ORIGIN}/api/user/me`, { headers: { cookie: COOKIE } }));

function saveTimeZone(timeZone: string) {
	const request = new Request(`${ORIGIN}/api/user/user-1`, {
		method: 'PUT',
		headers: { cookie: COOKIE, origin: ORIGIN, 'content-type': 'application/json' },
		body: JSON.stringify({ timeZone })
	});
	return updateUser(request, { params: Promise.resolve({ id: 'user-1' }) } as never);
}

async function timeZoneOf(response: Response): Promise<string | undefined> {
	const user = (await response.json()) as { timeZone?: string };
	return user.timeZone;
}

describe('the user read right after a profile save through this server', () => {
	beforeEach(() => {
		sessionChecks.clear();
		gauzy.timeZone = 'Europe/Berlin';
		gauzy.refusesSaves = false;
		gauzy.userReads = 0;
		global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
			gauzyAnswer(input, init)
		) as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('answers the time zone just saved', async () => {
		// The page read the user when it opened: this server keeps that answer for the routes of the next few seconds
		expect(await timeZoneOf(await userRead())).toBe('Europe/Berlin');

		const save = await saveTimeZone('Europe/Lisbon');
		expect(save.status).toBe(200);

		expect(await timeZoneOf(await userRead())).toBe('Europe/Lisbon');
	});

	it('answers a read that asks for a check made anew from the API, even where an older check is kept', async () => {
		// Another instance of this server: it kept the user before the save, and never saw the save itself
		await userRead();
		gauzy.timeZone = 'Europe/Lisbon';

		const kept = await userRead();
		const fresh = await readUser(new Request(`${ORIGIN}/api/user/me?fresh=1`, { headers: { cookie: COOKIE } }));

		expect(await timeZoneOf(kept)).toBe('Europe/Berlin');
		expect(await timeZoneOf(fresh)).toBe('Europe/Lisbon');
	});

	it('still shares one check between the routes that follow the save', async () => {
		await saveTimeZone('Europe/Lisbon');
		const readsAfterSave = gauzy.userReads;

		await userRead();
		await userRead();

		expect(gauzy.userReads - readsAfterSave).toBeLessThanOrEqual(1);
	});

	it('keeps the check it had when the API refuses the save', async () => {
		await userRead();
		const readsBeforeSave = gauzy.userReads;
		gauzy.refusesSaves = true;

		const save = await saveTimeZone('Europe/Lisbon');
		expect(save.status).toBe(400);
		await userRead();

		// The save itself checks the session through the kept answer, and so does the read after it
		expect(gauzy.userReads).toBe(readsBeforeSave);
	});
});
