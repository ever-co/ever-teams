import { createOrganizationRequest } from './organization';

const mockServerFetch = jest.fn();

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

describe('createOrganizationRequest', () => {
	it('creates the organization with a team and a project required on every time entry', async () => {
		mockServerFetch.mockResolvedValue({ data: { id: 'organization-1' } });

		await createOrganizationRequest(
			{ currency: 'USD', name: 'Acme', tenantId: 'tenant-1', invitesAllowed: true },
			'access-token'
		);

		expect(mockServerFetch).toHaveBeenCalledWith({
			path: '/organization',
			method: 'POST',
			body: {
				currency: 'USD',
				name: 'Acme',
				tenantId: 'tenant-1',
				invitesAllowed: true,
				requireTeam: true,
				requireProject: true
			},
			bearer_token: 'access-token'
		});
	});
});
