/**
 * @jest-environment node
 */
/**
 * Another workspace for the signed-in person (#5025): Gauzy opens the account it is created with, the sign-up's steps
 * set it up, and the addresses given are invited to its first team.
 */
const mockOpenWorkspace = jest.fn();
const mockEmployeeRole = jest.fn();
const mockInvite = jest.fn();
const mockProvision = jest.fn();

jest.mock('@/core/services/server/requests', () => ({
	openWorkspaceServerRequest: (...args: unknown[]) => mockOpenWorkspace(...args),
	getEmployeeRoleRequest: (...args: unknown[]) => mockEmployeeRole(...args),
	inviteByEmailsRequest: (...args: unknown[]) => mockInvite(...args)
}));
jest.mock('@/core/services/server/ever-id/provision', () => ({
	provisionEverIdWorkspace: (...args: unknown[]) => mockProvision(...args)
}));

import { NextResponse } from 'next/server';
import { createWorkspace } from './create-workspace';

const SESSION = {
	accessToken: 'workspace-token',
	tenantId: 'tenant-new',
	organizationId: 'organization-new',
	teamId: 'team-new',
	userId: 'account-1'
};

/** serverFetch's rejection of a non-2xx answer: a rejected promise holding Gauzy's body. */
const gauzyRefusal = (body: object) => {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
};

describe('createWorkspace', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockOpenWorkspace.mockResolvedValue({ data: { email: 'ada@ever.co', token: 'workspace-signin-token' } });
		mockEmployeeRole.mockResolvedValue({ data: { id: 'role-employee' } });
		mockInvite.mockResolvedValue({ data: { items: [], total: 0 } });
		// The setup signs the new workspace in, then runs the next step with its session
		mockProvision.mockImplementation(async ({ onProvisioned }) => {
			await onProvisioned?.(SESSION);
			return 'ok';
		});
	});

	const create = (invites: string[] = []) =>
		createWorkspace({
			req: new Request('https://app.ever.team/api/auth/create-workspace'),
			response: new NextResponse(),
			accessToken: 'current-token',
			tenantId: 'tenant-current',
			name: 'Lovelace Studio',
			teamName: 'Design',
			invites,
			languageId: 'fr'
		});

	it("sets up the account Gauzy opens for the person's address, named as asked", async () => {
		await expect(create()).resolves.toEqual({ status: 'ok', invited: 0, invitesFailed: false });

		expect(mockOpenWorkspace).toHaveBeenCalledWith('current-token', 'tenant-current');
		expect(mockProvision.mock.calls[0][0]).toMatchObject({
			email: 'ada@ever.co',
			workspaceToken: 'workspace-signin-token',
			workspace: 'Lovelace Studio',
			team: 'Design',
			languageId: 'fr',
			onProvisioned: undefined
		});
	});

	it("invites the addresses to the new team, in the new workspace's session, as employees", async () => {
		await expect(create(['grace@ever.co', 'alan@ever.co'])).resolves.toEqual({
			status: 'ok',
			invited: 2,
			invitesFailed: false
		});

		expect(mockEmployeeRole.mock.calls[0][0]).toMatchObject({
			tenantId: 'tenant-new',
			bearer_token: 'workspace-token'
		});
		const [invite, token] = mockInvite.mock.calls[0];
		expect(token).toBe('workspace-token');
		expect(invite).toMatchObject({
			emailIds: ['grace@ever.co', 'alan@ever.co'],
			teamIds: ['team-new'],
			roleId: 'role-employee',
			inviteType: 'TEAM',
			organizationId: 'organization-new',
			tenantId: 'tenant-new',
			callbackUrl: expect.stringMatching(/^https:\/\/app\.ever\.team\//)
		});
	});

	it('keeps the workspace when the invitations fail, and says so', async () => {
		mockInvite.mockRejectedValue(new Error('refused'));

		await expect(create(['grace@ever.co'])).resolves.toEqual({ status: 'ok', invited: 0, invitesFailed: true });
	});

	it("tells an unconfirmed address from closed registration in Gauzy's refusal", async () => {
		mockOpenWorkspace.mockImplementationOnce(() =>
			gauzyRefusal({ statusCode: 403, message: 'Confirm your email address before opening another workspace' })
		);
		await expect(create()).resolves.toEqual({ status: 'address_unconfirmed' });

		mockOpenWorkspace.mockImplementationOnce(() =>
			gauzyRefusal({ statusCode: 403, message: 'Creating new workspaces is disabled on this server.' })
		);
		await expect(create()).resolves.toEqual({ status: 'registration_closed' });

		expect(mockProvision).not.toHaveBeenCalled();
	});

	it('reads any other refusal as a failure, not as closed registration', async () => {
		mockOpenWorkspace.mockImplementationOnce(() =>
			gauzyRefusal({ statusCode: 403, message: 'Opening a workspace is not allowed for this token' })
		);
		await expect(create()).resolves.toEqual({ status: 'failed' });
		expect(mockProvision).not.toHaveBeenCalled();
	});

	it('fails without setting anything up when Gauzy cannot open the account, or the setup fails', async () => {
		mockOpenWorkspace.mockImplementationOnce(() =>
			gauzyRefusal({ statusCode: 500, message: 'Internal server error' })
		);
		await expect(create()).resolves.toEqual({ status: 'failed' });
		expect(mockProvision).not.toHaveBeenCalled();

		mockProvision.mockResolvedValueOnce('failed');
		await expect(create()).resolves.toEqual({ status: 'failed' });
	});
});
