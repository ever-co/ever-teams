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
		jest.spyOn(organizationService, 'getOrganizationById').mockRejectedValue(new Error('offline'));

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

	it("sends the organization's current name and currency, so another admin's rename is not undone", async () => {
		const put = jest.spyOn(organizationService, 'put').mockResolvedValue({ data: {} } as never);
		jest.spyOn(organizationService, 'getOrganizationById').mockResolvedValue({
			id: 'organization-a',
			name: 'Acme Labs',
			currency: 'EUR'
		} as never);

		const pageCopy = { id: 'organization-a', name: 'Acme', currency: 'USD' };
		await organizationService.updateOrganization(pageCopy, { requireProject: true });

		expect(put).toHaveBeenCalledWith(
			'/organization/organization-a',
			{ name: 'Acme Labs', currency: 'EUR', requireProject: true },
			expect.anything()
		);
	});
});

describe('OrganizationService.getOrganizationCounts', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("reads what the organization holds from Gauzy's GET /organization/:id/counts", async () => {
		const counts = { teams: 2, projects: 3, members: 4, trackedSeconds: 7200, invoices: 5, estimates: 1 };
		const get = jest.spyOn(organizationService, 'get').mockResolvedValue({ data: counts } as never);

		await expect(organizationService.getOrganizationCounts('organization-a')).resolves.toEqual(counts);

		expect(get).toHaveBeenCalledWith('/organization/organization-a/counts', expect.anything());
	});

	it('refuses an answer that is not the counts, so the confirmation never shows numbers it made up', async () => {
		jest.spyOn(organizationService, 'get').mockResolvedValue({ data: { id: 'organization-a' } } as never);

		await expect(organizationService.getOrganizationCounts('organization-a')).rejects.toThrow();
	});
});

describe('OrganizationService.softDeleteOrganization', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("deletes the organization with Gauzy's soft delete, which hides it with its teams and memberships", async () => {
		const remove = jest.spyOn(organizationService, 'delete').mockResolvedValue({ data: {} } as never);

		await organizationService.softDeleteOrganization('organization-a');

		expect(remove).toHaveBeenCalledWith('/organization/organization-a/soft', expect.anything());
	});
});

describe('OrganizationService.countWorkspaceOrganizations', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("counts the workspace's live organizations with Gauzy's GET /organization/count", async () => {
		const get = jest.spyOn(organizationService, 'get').mockResolvedValue({ data: 2 } as never);

		await expect(organizationService.countWorkspaceOrganizations()).resolves.toBe(2);

		expect(get).toHaveBeenCalledWith('/organization/count', expect.anything());
	});
});
