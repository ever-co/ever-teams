import { organizationService } from './organization.service';

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
