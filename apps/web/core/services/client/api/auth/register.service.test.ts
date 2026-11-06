import { registerService } from './register.service';

describe('RegisterService.createOrganization', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('creates the organization of a direct-mode sign-up with a team and a project required', async () => {
		const post = jest.spyOn(registerService, 'post').mockResolvedValue({ data: { id: 'organization-a' } } as never);

		await registerService.createOrganization(
			{ currency: 'USD', name: 'Acme', tenantId: 'tenant-a', invitesAllowed: true },
			'access-token'
		);

		expect(post).toHaveBeenCalledWith(
			'/organization',
			expect.objectContaining({ name: 'Acme', requireTeam: true, requireProject: true }),
			expect.anything()
		);
	});
});
