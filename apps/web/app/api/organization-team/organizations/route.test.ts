/**
 * @jest-environment node
 */
/**
 * GET /api/organization-team/organizations (ever-co/ever-teams#5204): the team menu's organizations in proxy mode,
 * read with the caller's session; refused without one.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetUserOrganizations = jest.fn();
const mockGetAllOrganizationTeams = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getUserOrganizationsRequest: (...args: unknown[]) => mockGetUserOrganizations(...args),
	getAllOrganizationTeamRequest: (...args: unknown[]) => mockGetAllOrganizationTeams(...args)
}));

import { GET } from './route';

const memberships = {
	items: [
		{ organizationId: 'studio', organization: { id: 'studio', name: 'Studio' } },
		{ organizationId: 'labs', organization: { id: 'labs', name: 'Labs' } }
	]
};

function signedInAs(roleName: string) {
	return {
		user: { id: 'user-1', role: { name: roleName } },
		access_token: 'token-studio',
		tenantId: 'tenant-1',
		organizationId: 'studio'
	};
}

const read = () => GET(new Request('https://app.example.test/api/organization-team/organizations'));

describe('GET /api/organization-team/organizations', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetUserOrganizations.mockResolvedValue({ data: memberships });
		mockGetAllOrganizationTeams.mockResolvedValue({
			data: { items: [{ id: 'labs-team', name: 'Labs Design', organizationId: 'labs' }] }
		});
	});

	it('refuses a caller without a session and reads nothing', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ user: null, status: 401 });

		const response = await read();

		expect(response.status).toBe(401);
		expect(mockGetUserOrganizations).not.toHaveBeenCalled();
	});

	it("lists the other organization's teams to a workspace admin, with the caller's session", async () => {
		mockAuthenticatedGuard.mockResolvedValue(signedInAs('ADMIN'));

		const response = await read();

		expect(response.status).toBe(200);
		expect(mockGetUserOrganizations).toHaveBeenCalledWith({ tenantId: 'tenant-1', userId: 'user-1' }, 'token-studio');
		expect(mockGetAllOrganizationTeams).toHaveBeenCalledWith(
			{ tenantId: 'tenant-1', organizationId: 'labs' },
			'token-studio'
		);
		await expect(response.json()).resolves.toEqual({
			current: { id: 'studio', name: 'Studio' },
			others: [
				{
					id: 'labs',
					name: 'Labs',
					teams: [{ id: 'labs-team', name: 'Labs Design', organizationId: 'labs' }],
					teamsListed: true
				}
			]
		});
	});

	it('offers the other organization as a switch to a member, without reading its teams', async () => {
		mockAuthenticatedGuard.mockResolvedValue(signedInAs('EMPLOYEE'));

		const response = await read();

		expect(mockGetAllOrganizationTeams).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toMatchObject({
			others: [{ id: 'labs', name: 'Labs', teams: [], teamsListed: false }]
		});
	});

	it('answers 502 when Gauzy does not answer the memberships', async () => {
		mockAuthenticatedGuard.mockResolvedValue(signedInAs('ADMIN'));
		mockGetUserOrganizations.mockRejectedValue(new Error('503'));

		const response = await read();

		expect(response.status).toBe(502);
	});
});
