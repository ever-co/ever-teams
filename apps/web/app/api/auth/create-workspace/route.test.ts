/**
 * @jest-environment node
 */
/**
 * POST /api/auth/create-workspace (#5025): checks the session and the body, creates the workspace, and answers with the
 * new workspace's session cookies, or why it could not.
 */
const mockAuthenticatedGuard = jest.fn();
const mockCreateWorkspace = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/create-workspace', () => ({
	createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args)
}));

import { NextResponse } from 'next/server';
import { POST } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1', isEmailVerified: true },
	access_token: 'current-token',
	tenantId: 'tenant-current'
};

function post(body: unknown) {
	return POST(
		new Request('https://app.ever.team/api/auth/create-workspace', {
			method: 'POST',
			headers: { cookie: 'auth-active-language=fr; auth-timezone=Europe%2FParis' },
			body: JSON.stringify(body)
		})
	);
}

describe('POST /api/auth/create-workspace', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		mockCreateWorkspace.mockImplementation(async ({ response }: { response: NextResponse }) => {
			response.cookies.set('auth-tenant-id', 'tenant-new');
			response.cookies.set('auth-token', 'workspace-token');
			return { status: 'ok', invited: 1, invitesFailed: false };
		});
	});

	it('creates the workspace and answers with its session, the team named after the workspace unless given', async () => {
		const response = await post({ name: '  Lovelace Studio ', invites: ['Grace@Ever.co', 'grace@ever.co'] });

		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual({ invited: 1, invitesFailed: false });
		expect(response.headers.get('set-cookie')).toContain('auth-tenant-id=tenant-new');
		expect(mockCreateWorkspace.mock.calls[0][0]).toMatchObject({
			accessToken: 'current-token',
			tenantId: 'tenant-current',
			name: 'Lovelace Studio',
			teamName: 'Lovelace Studio',
			invites: ['grace@ever.co'],
			languageId: 'fr',
			timezone: 'Europe/Paris'
		});
	});

	it('refuses a body without a name, or with an address that is not one, before creating anything', async () => {
		expect((await post({ name: '  ' })).status).toBe(400);
		expect((await post({ name: 'Studio', invites: ['not an address'] })).status).toBe(400);
		expect(mockCreateWorkspace).not.toHaveBeenCalled();
	});

	it('says an unconfirmed address must be confirmed first, without asking Gauzy', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ ...SIGNED_IN, user: { id: 'user-1', isEmailVerified: false } });

		const response = await post({ name: 'Studio' });

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual({ code: 'ADDRESS_UNCONFIRMED' });
		expect(mockCreateWorkspace).not.toHaveBeenCalled();
	});

	it("answers Gauzy's refusals and failures with a code the page can explain", async () => {
		mockCreateWorkspace.mockResolvedValueOnce({ status: 'registration_closed' });
		const closed = await post({ name: 'Studio' });
		expect(closed.status).toBe(403);
		await expect(closed.json()).resolves.toEqual({ code: 'REGISTRATION_CLOSED' });

		mockCreateWorkspace.mockResolvedValueOnce({ status: 'failed' });
		const failed = await post({ name: 'Studio' });
		expect(failed.status).toBe(502);
		expect(failed.headers.get('set-cookie')).toBeNull();

		// The workspace exists, but its session could not be opened: said apart, so the page does not offer a retry
		mockCreateWorkspace.mockResolvedValueOnce({ status: 'created_unopened' });
		const unopened = await post({ name: 'Studio' });
		expect(unopened.status).toBe(502);
		await expect(unopened.json()).resolves.toEqual({ code: 'CREATED_NOT_OPENED' });
		expect(unopened.headers.get('set-cookie')).toBeNull();
	});

	it("answers the guard's own refusal without a session", async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
			user: null
		});

		expect((await post({ name: 'Studio' })).status).toBe(401);
		expect(mockCreateWorkspace).not.toHaveBeenCalled();
	});
});
