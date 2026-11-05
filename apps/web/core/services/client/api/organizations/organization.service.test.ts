import { organizationService } from './organization.service';

describe('OrganizationService.createOrganization', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('creates the organization with a team and a project required on every time entry', async () => {
		const post = jest
			.spyOn(organizationService, 'post')
			.mockResolvedValue({ data: { id: 'organization-a' } } as never);

		await organizationService.createOrganization(
			{ currency: 'USD', name: 'Acme', tenantId: 'tenant-a', invitesAllowed: true },
			'access-token'
		);

		expect(post).toHaveBeenCalledWith(
			'/organization',
			{
				currency: 'USD',
				name: 'Acme',
				tenantId: 'tenant-a',
				invitesAllowed: true,
				requireTeam: true,
				requireProject: true
			},
			expect.anything()
		);
	});
});

describe('OrganizationService.updateOrganization', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("sends the change with the organization's name and currency, which Gauzy validates on every update", async () => {
		const saved = { id: 'organization-a', name: 'Acme', currency: 'USD', requireTeam: true };
		const put = jest.spyOn(organizationService, 'put').mockResolvedValue({ data: saved } as never);

		const organization = { id: 'organization-a', name: 'Acme', currency: 'USD' };
		await expect(organizationService.updateOrganization(organization, { requireTeam: true })).resolves.toEqual(
			saved
		);

		expect(put).toHaveBeenCalledWith(
			'/organization/organization-a',
			{ name: 'Acme', currency: 'USD', requireTeam: true },
			expect.anything()
		);
	});
});
