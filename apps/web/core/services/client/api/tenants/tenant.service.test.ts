import { tenantService } from './tenant.service';

describe('TenantService.renameTenant', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const workspace = { tenantId: 'tenant-a', accessToken: 'token-a' };

	it('renames the tenant the page was showing, with the token of that workspace and not the session of the moment', async () => {
		const put = jest.spyOn(tenantService, 'put').mockResolvedValue({ data: { affected: 1 } } as never);

		await expect(tenantService.renameTenant('Acme Labs', workspace)).resolves.toBeUndefined();

		expect(put).toHaveBeenCalledWith(
			'/tenant',
			{ name: 'Acme Labs', tenantId: 'tenant-a' },
			expect.objectContaining({
				tenantId: 'tenant-a',
				pinnedAuthorization: true,
				headers: { Authorization: 'Bearer token-a' }
			})
		);
	});

	it("rejects with Gauzy's refusal, so the page can say why the name was not saved", async () => {
		const refusal = Object.assign(new Error('Forbidden resource'), { statusCode: 403 });
		jest.spyOn(tenantService, 'put').mockRejectedValue(refusal);

		await expect(tenantService.renameTenant('Acme Labs', workspace)).rejects.toBe(refusal);
	});
});
