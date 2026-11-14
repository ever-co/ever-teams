/**
 * The team menu's organizations (ever-co/ever-teams#5204): direct mode reads the memberships, then each other
 * organization's teams for a workspace admin; proxy mode asks the app's route, which reads the same thing.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

const mockProxyGet = jest.fn();
jest.mock('@/core/services/client/api.service', () => {
	const actual = jest.requireActual('@/core/services/client/api.service');
	return { ...actual, getFallbackAPI: async () => ({ get: mockProxyGet }) };
});

const mockGetUserOrganizations = jest.fn();
jest.mock('@/core/services/client/api/users/user-organization.service', () => ({
	userOrganizationService: { getUserOrganizations: (...args: unknown[]) => mockGetUserOrganizations(...args) }
}));

const mockGetOrganizationTeams = jest.fn();
jest.mock('./team.service', () => ({
	organizationTeamService: { getOrganizationTeams: (...args: unknown[]) => mockGetOrganizationTeams(...args) }
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { TEAM_MENU_ORGANIZATIONS_ROUTE, teamMenuOrganizationsService } from './team-menu-organizations.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };
const scope = {
	tenantId: 'tenant-1',
	organizationId: 'studio',
	userId: 'user-1',
	accessToken: 'token-studio'
};
const memberships = {
	items: [
		{ organizationId: 'studio', organization: { id: 'studio', name: 'Studio' } },
		{ organizationId: 'labs', organization: { id: 'labs', name: 'Labs' } }
	]
};

describe('teamMenuOrganizationsService.getTeamMenuOrganizations', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetUserOrganizations.mockResolvedValue({ data: memberships });
		mockGetOrganizationTeams.mockResolvedValue({
			data: { items: [{ id: 'labs-team', name: 'Labs Design', organizationId: 'labs' }] }
		});
	});

	afterEach(() => {
		publishedApiOrigin.value = undefined;
	});

	it("reads the memberships, then the other organization's teams with the same session, in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';

		const result = await teamMenuOrganizationsService.getTeamMenuOrganizations({ scope, listsTeams: true });

		expect(mockGetUserOrganizations).toHaveBeenCalledWith({
			tenantId: 'tenant-1',
			userId: 'user-1',
			token: 'token-studio'
		});
		expect(mockGetOrganizationTeams).toHaveBeenCalledWith(
			expect.objectContaining({ scope: { ...scope, organizationId: 'labs' } })
		);
		expect(result).toEqual({
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
		expect(mockProxyGet).not.toHaveBeenCalled();
	});

	it('reads no team of another organization for someone Gauzy keeps in their session organization', async () => {
		publishedApiOrigin.value = 'https://api.example.test';

		const result = await teamMenuOrganizationsService.getTeamMenuOrganizations({ scope, listsTeams: false });

		expect(mockGetOrganizationTeams).not.toHaveBeenCalled();
		expect(result.others).toEqual([{ id: 'labs', name: 'Labs', teams: [], teamsListed: false }]);
	});

	it("asks the app's route in proxy mode", async () => {
		const answer = { current: { id: 'studio', name: 'Studio' }, others: [] };
		mockProxyGet.mockResolvedValue({ data: answer });

		const result = await teamMenuOrganizationsService.getTeamMenuOrganizations({ scope, listsTeams: true });

		expect(mockProxyGet).toHaveBeenCalledWith(TEAM_MENU_ORGANIZATIONS_ROUTE, { signal: undefined });
		expect(mockGetUserOrganizations).not.toHaveBeenCalled();
		expect(result).toEqual(answer);
	});
});
