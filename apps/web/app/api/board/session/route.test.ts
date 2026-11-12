/**
 * GET /api/board/session tells the Board app who is signed in to this deployment, so the Board needs no token: it
 * answers the trusted Board origin only (CORS with credentials, exact origin), names the person (id, name, picture,
 * never the e-mail address, the tenant or a token), and passes the session check's refusal on with its own status,
 * which the Board can read. Any other origin gets 403 before any session check.
 */
import { refused, signedIn } from '@/test/auth/guard-answers';
import { GET, OPTIONS } from './route';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

const ORIGINAL_ENV = process.env;
const BOARD_ORIGIN = 'https://board.ever.team';
const SESSION_USER = {
	id: 'user-1',
	email: 'ada@example.com',
	name: 'Ada Lovelace',
	firstName: 'Ada',
	lastName: 'Lovelace',
	imageUrl: 'https://cdn.example.com/ada.png',
	tenantId: 'tenant-1',
	role: { name: 'ADMIN' }
};

function sessionRequest(origin: string | null, method = 'GET'): Request {
	const headers: Record<string, string> = { cookie: 'auth-token=access-token; auth-tenant-id=tenant-1' };
	if (origin !== null) {
		headers.origin = origin;
	}
	return new Request('https://app.ever.team/api/board/session', { method, headers });
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: 'https://board.ever.team/' };
	mockAuthenticatedGuard.mockResolvedValue(signedIn(SESSION_USER));
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('GET /api/board/session', () => {
	it('names the signed-in person to the Board origin, and nothing more', async () => {
		const response = await GET(sessionRequest(BOARD_ORIGIN));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			id: 'user-1',
			name: 'Ada Lovelace',
			imageUrl: 'https://cdn.example.com/ada.png'
		});
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('access-control-allow-credentials')).toBe('true');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(response.headers.get('vary')).toBe('Origin, Cookie');
	});

	it('checks the session of the cookies the browser sent', async () => {
		const request = sessionRequest(BOARD_ORIGIN);

		await GET(request);

		expect(mockAuthenticatedGuard).toHaveBeenCalledTimes(1);
		expect(mockAuthenticatedGuard.mock.calls[0][0]).toBe(request);
	});

	it.each([401, 503])('passes a refused session check (%i) on to the Board, readable by it', async (status) => {
		mockAuthenticatedGuard.mockResolvedValue(refused(status));

		const response = await GET(sessionRequest(BOARD_ORIGIN));

		expect(response.status).toBe(status);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('access-control-allow-credentials')).toBe('true');
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).not.toHaveProperty('id');
	});

	it('answers 401 at once when the browser sent no session cookie, without asking the API', async () => {
		const request = new Request('https://app.ever.team/api/board/session', {
			headers: { origin: BOARD_ORIGIN, cookie: 'auth-tenant-id=tenant-1' }
		});

		const response = await GET(request);

		expect(response.status).toBe(401);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});

	it.each([
		['no origin (a direct visit or a same-origin call)', null],
		['another site', 'https://evil.example'],
		['this app itself', 'https://app.ever.team'],
		['a look-alike subdomain', 'https://board.ever.team.evil.example'],
		['a look-alike prefix', 'https://evilboard.ever.team'],
		['plain http', 'http://board.ever.team'],
		['another port', 'https://board.ever.team:8443'],
		['an opaque origin', 'null']
	])('refuses %s with 403, without checking the session', async (_label, origin) => {
		const response = await GET(sessionRequest(origin));

		expect(response.status).toBe(403);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
		expect(response.headers.get('access-control-allow-credentials')).toBeNull();
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});

	it('refuses every origin when no Board app is configured, or one without https', async () => {
		for (const boardAppDomain of ['', 'http://board.ever.team']) {
			process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN = boardAppDomain;
			const origin = boardAppDomain ? new URL(boardAppDomain).origin : BOARD_ORIGIN;

			const response = await GET(sessionRequest(origin));

			expect(response.status).toBe(403);
		}
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});
});

describe('OPTIONS /api/board/session', () => {
	it('lets the Board origin send its request with the cookies', async () => {
		const response = OPTIONS(sessionRequest(BOARD_ORIGIN, 'OPTIONS'));

		expect(response.status).toBe(204);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('access-control-allow-credentials')).toBe('true');
		expect(response.headers.get('access-control-allow-methods')).toBe('GET');
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});

	it('refuses any other origin', async () => {
		const response = OPTIONS(sessionRequest('https://evil.example', 'OPTIONS'));

		expect(response.status).toBe(403);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
	});
});
