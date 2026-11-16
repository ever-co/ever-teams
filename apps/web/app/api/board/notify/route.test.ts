/**
 * POST /api/board/notify tells colleagues of a Board shared with them or a mention in one, for the Board app (#5022):
 * it answers the trusted Board origin only, reads only a JSON body, checks it, and forwards it to Gauzy's
 * board-share or board-mention route with the session of the cookies, passing Gauzy's refusals on with their status.
 */
import { refused, signedIn } from '@/test/auth/guard-answers';
import { gauzyAnswers, gauzyUrl, restoreFetch } from '@/test/api/forward-to-gauzy';
import { OPTIONS, POST } from './route';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

const ORIGINAL_ENV = process.env;
const BOARD_ORIGIN = 'https://board.ever.team';
const ANA = '4a29dfd5-1985-46db-83cc-ea734886999c';
const BO = 'a70a3760-b8af-4380-9792-41a7d0825269';
const ROOM_LINK = `${BOARD_ORIGIN}/#room=6f1c2a9e4b7d3c5a8e0f,secret-room-key`;
const SHARE = {
	kind: 'share',
	receiverEmployeeIds: [ANA, BO, ANA],
	roomId: '6f1c2a9e4b7d3c5a8e0f',
	boardName: 'Sprint plan',
	link: ROOM_LINK
};

function notifyRequest(
	body: unknown,
	{ origin = BOARD_ORIGIN, contentType = 'application/json', cookie = 'auth-token=access-token' } = {} as {
		origin?: string | null;
		contentType?: string;
		cookie?: string;
	}
): Request {
	const headers: Record<string, string> = { 'content-type': contentType };
	if (origin !== null) headers.origin = origin;
	if (cookie) headers.cookie = cookie;
	return new Request('https://app.ever.team/api/board/notify', {
		method: 'POST',
		headers,
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: `${BOARD_ORIGIN}/` };
	mockAuthenticatedGuard.mockReset();
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1', tenantId: 'tenant-1' }));
});

afterEach(restoreFetch);

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('POST /api/board/notify', () => {
	it.each([
		['another origin', 'https://evil.example'],
		['a look-alike origin', 'https://board.ever.team.evil.example'],
		['no origin', null]
	])('refuses %s before anything else, with nothing readable', async (_, origin) => {
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		const response = await POST(notifyRequest(SHARE, { origin }));

		expect(response.status).toBe(403);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses everyone while no Board app is configured', async () => {
		process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: '' };
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		expect((await POST(notifyRequest(SHARE))).status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x'])(
		'reads no %s body, which a plain form could send',
		async (contentType) => {
			const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

			const response = await POST(notifyRequest(SHARE, { contentType }));

			expect(response.status).toBe(415);
			expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
			expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		}
	);

	it('forwards a share to Gauzy with the session, in the organization worked in, without a tenant header', async () => {
		const fetchMock = gauzyAnswers(Response.json({ notified: 2 }, { status: 201 }));

		const response = await POST(notifyRequest(SHARE));

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ notified: 2 });
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('access-control-allow-credentials')).toBe('true');
		expect(response.headers.get('cache-control')).toBe('no-store');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(gauzyUrl('/employee-notification/board-share'));
		expect(init.method).toBe('POST');
		expect(init.headers).toEqual(expect.objectContaining({ authorization: 'Bearer access-token' }));
		expect(init.headers).not.toHaveProperty('tenant-id');
		expect(JSON.parse(init.body as string)).toEqual({
			receiverEmployeeIds: [ANA, BO],
			roomId: '6f1c2a9e4b7d3c5a8e0f',
			boardName: 'Sprint plan',
			link: ROOM_LINK,
			organizationId: 'organization-1'
		});
	});

	it("forwards a mention to Gauzy's board-mention route", async () => {
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		const response = await POST(
			notifyRequest({ kind: 'mention', receiverEmployeeIds: [BO], snapshotId: 'Yp3kQ9_xV2' })
		);

		expect(response.status).toBe(201);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(gauzyUrl('/employee-notification/board-mention'));
		expect(JSON.parse(init.body as string)).toEqual({
			receiverEmployeeIds: [BO],
			snapshotId: 'Yp3kQ9_xV2',
			organizationId: 'organization-1'
		});
	});

	it.each([
		['no colleague', { ...SHARE, receiverEmployeeIds: [] }],
		[
			'more than 50 colleagues',
			{
				...SHARE,
				receiverEmployeeIds: Array.from(
					{ length: 51 },
					(_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
				)
			}
		],
		['a user name instead of an employee id', { ...SHARE, receiverEmployeeIds: ['ana@example.com'] }],
		['both a room and a snapshot', { ...SHARE, snapshotId: 'Yp3kQ9_xV2' }],
		['neither a room nor a snapshot', { ...SHARE, roomId: undefined }],
		['another kind', { ...SHARE, kind: 'permission' }],
		['a link outside the Board app', { ...SHARE, link: 'https://evil.example/#room=1,key' }],
		['a link with a user name', { ...SHARE, link: 'https://board.ever.team@evil.example/#room=1,key' }],
		['a body that is not JSON', '{not json']
	])('refuses %s, without asking Gauzy or repeating the link', async (_, body) => {
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		const response = await POST(notifyRequest(body));

		expect(response.status).toBe(400);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(JSON.stringify(await response.json())).not.toContain('key');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 401 at once when the browser sent no session cookie', async () => {
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		const response = await POST(notifyRequest(SHARE, { cookie: '' }));

		expect(response.status).toBe(401);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([401, 503])('passes a refused session check (%i) on to the Board', async (status) => {
		mockAuthenticatedGuard.mockResolvedValue(refused(status));
		const fetchMock = gauzyAnswers(Response.json({ notified: 1 }, { status: 201 }));

		const response = await POST(notifyRequest(SHARE));

		expect(response.status).toBe(status);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		[403, { statusCode: 403, message: 'Not an employee of this organization' }],
		[429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' }]
	])("passes Gauzy's refusal (%i) on to the Board, with its status", async (status, body) => {
		gauzyAnswers(Response.json(body, { status }));

		const response = await POST(notifyRequest(SHARE));

		expect(response.status).toBe(status);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
	});

	it('never logs the link, even when Gauzy refuses it', async () => {
		const logged = [jest.spyOn(console, 'error'), jest.spyOn(console, 'log'), jest.spyOn(console, 'warn')].map(
			(spy) => spy.mockImplementation(() => undefined)
		);
		gauzyAnswers(Response.json({ statusCode: 400, message: ['link must be a URL address'] }, { status: 400 }));

		await POST(notifyRequest(SHARE));

		for (const spy of logged) {
			expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-room-key');
			spy.mockRestore();
		}
	});
});

describe('OPTIONS /api/board/notify', () => {
	it("answers the Board's preflight of a JSON POST", async () => {
		const response = OPTIONS(
			new Request('https://app.ever.team/api/board/notify', {
				method: 'OPTIONS',
				headers: { origin: BOARD_ORIGIN }
			})
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('access-control-allow-methods')).toBe('POST');
		expect(response.headers.get('access-control-allow-headers')).toContain('Content-Type');
	});

	it('refuses the preflight of any other origin', async () => {
		const response = OPTIONS(
			new Request('https://app.ever.team/api/board/notify', {
				method: 'OPTIONS',
				headers: { origin: 'https://evil.example' }
			})
		);

		expect(response.status).toBe(403);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});
});
