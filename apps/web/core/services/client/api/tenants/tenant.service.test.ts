import { tenantService } from './tenant.service';

describe('TenantService.renameTenant', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("renames the session's tenant with the name and nothing else", async () => {
		const put = jest.spyOn(tenantService, 'put').mockResolvedValue({ data: { affected: 1 } } as never);

		await expect(tenantService.renameTenant('Acme Labs')).resolves.toBeUndefined();

		expect(put).toHaveBeenCalledWith('/tenant', { name: 'Acme Labs' }, expect.anything());
	});

	it("rejects with Gauzy's refusal, so the page can say why the name was not saved", async () => {
		const refusal = Object.assign(new Error('Forbidden resource'), { statusCode: 403 });
		jest.spyOn(tenantService, 'put').mockRejectedValue(refusal);

		await expect(tenantService.renameTenant('Acme Labs')).rejects.toBe(refusal);
	});
});
