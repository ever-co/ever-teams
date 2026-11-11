/**
 * @jest-environment node
 */
/**
 * The workspace setup of an account without a tenant, from its workspace sign-in: the options a workspace created from
 * the app adds (#5025), its own name for the tenant and organization, the session's language, and a step run in the
 * new workspace once it is signed in.
 */
const mockRequests = {
	createTenantRequest: jest.fn(),
	createTenantSmtpRequest: jest.fn(),
	createOrganizationRequest: jest.fn(),
	createEmployeeFromUser: jest.fn(),
	createOrganizationTeamRequest: jest.fn(),
	refreshTokenRequest: jest.fn(),
	getAllOrganizationTeamRequest: jest.fn(),
	getOrganizationEmployees: jest.fn(),
	getUserOrganizationsRequest: jest.fn()
};
const mockWorkspaceSignin = jest.fn();
const mockSetAuthCookies = jest.fn();

jest.mock('@/core/services/server/requests', () => ({
	get createTenantRequest() {
		return mockRequests.createTenantRequest;
	},
	get createTenantSmtpRequest() {
		return mockRequests.createTenantSmtpRequest;
	},
	get createOrganizationRequest() {
		return mockRequests.createOrganizationRequest;
	},
	get createEmployeeFromUser() {
		return mockRequests.createEmployeeFromUser;
	},
	get createOrganizationTeamRequest() {
		return mockRequests.createOrganizationTeamRequest;
	},
	get refreshTokenRequest() {
		return mockRequests.refreshTokenRequest;
	},
	get getAllOrganizationTeamRequest() {
		return mockRequests.getAllOrganizationTeamRequest;
	},
	get getOrganizationEmployees() {
		return mockRequests.getOrganizationEmployees;
	},
	get getUserOrganizationsRequest() {
		return mockRequests.getUserOrganizationsRequest;
	}
}));
jest.mock('@/core/services/server/requests/ever-id', () => ({
	everIdWorkspaceSigninRequest: (...args: unknown[]) => mockWorkspaceSignin(...args)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args)
}));

import { NextResponse } from 'next/server';
import { provisionEverIdWorkspace } from './provision';

describe('provisionEverIdWorkspace', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockWorkspaceSignin.mockResolvedValue({
			status: 200,
			data: {
				token: 'account-token',
				refresh_token: 'account-refresh',
				user: { id: 'account-1', tenantId: null, firstName: 'Ada', lastName: 'Lovelace' }
			}
		});
		mockRequests.createTenantRequest.mockResolvedValue({ data: { id: 'tenant-new' } });
		mockRequests.createOrganizationRequest.mockResolvedValue({ data: { id: 'organization-new' } });
		mockRequests.createEmployeeFromUser.mockResolvedValue({ data: { id: 'employee-new' } });
		mockRequests.createOrganizationTeamRequest.mockResolvedValue({ data: { id: 'team-new' } });
		mockRequests.refreshTokenRequest.mockResolvedValue({
			data: { token: 'workspace-token', refresh_token: 'workspace-refresh' }
		});
	});

	const provision = (options: Partial<Parameters<typeof provisionEverIdWorkspace>[0]> = {}) =>
		provisionEverIdWorkspace({
			req: new Request('https://app.ever.team/api/auth/create-workspace'),
			response: new NextResponse(),
			email: 'ada@ever.co',
			workspaceToken: 'workspace-signin-token',
			...options
		});

	it('names the tenant and organization after the workspace, the first team after the team', async () => {
		await expect(provision({ team: 'Design', workspace: 'Lovelace Studio' })).resolves.toBe('ok');

		expect(mockRequests.createTenantRequest).toHaveBeenCalledWith('Lovelace Studio', 'account-token');
		expect(mockRequests.createOrganizationRequest.mock.calls[0][0]).toMatchObject({ name: 'Lovelace Studio' });
		expect(mockRequests.createOrganizationTeamRequest.mock.calls[0][0]).toMatchObject({
			name: 'Design',
			managerIds: ['employee-new']
		});
	});

	it('names all three after the team when no workspace name is given, as a sign-up does', async () => {
		await provision({ team: 'Design' });

		expect(mockRequests.createTenantRequest).toHaveBeenCalledWith('Design', 'account-token');
		expect(mockRequests.createOrganizationRequest.mock.calls[0][0]).toMatchObject({ name: 'Design' });
	});

	it("signs in with the session's language, English by default", async () => {
		await provision({ languageId: 'fr' });
		expect(mockSetAuthCookies.mock.calls[0][0]).toMatchObject({ languageId: 'fr', tenantId: 'tenant-new' });

		await provision();
		expect(mockSetAuthCookies.mock.calls[1][0]).toMatchObject({ languageId: 'en' });
	});

	it('runs the next step in the new workspace with its session, and a failure of it keeps the workspace', async () => {
		const onProvisioned = jest.fn(async () => {
			throw new Error('invitations refused');
		});

		await expect(provision({ onProvisioned })).resolves.toBe('ok');

		expect(onProvisioned).toHaveBeenCalledWith({
			accessToken: 'workspace-token',
			tenantId: 'tenant-new',
			organizationId: 'organization-new',
			teamId: 'team-new',
			userId: 'account-1'
		});
	});

	it('tells once the workspace and its team exist, even when its session cannot be opened afterwards', async () => {
		mockRequests.refreshTokenRequest.mockRejectedValue(new Error('Gauzy restarted'));
		const onSetUp = jest.fn();

		await expect(provision({ onSetUp })).resolves.toBe('failed');

		expect(onSetUp).toHaveBeenCalledWith({
			tenantId: 'tenant-new',
			organizationId: 'organization-new',
			teamId: 'team-new',
			userId: 'account-1'
		});
		expect(mockSetAuthCookies).not.toHaveBeenCalled();
	});

	it('tells nothing when a step before the team fails', async () => {
		mockRequests.createOrganizationTeamRequest.mockRejectedValue(new Error('refused'));
		const onSetUp = jest.fn();

		await expect(provision({ onSetUp })).resolves.toBe('failed');
		expect(onSetUp).not.toHaveBeenCalled();
	});
});
