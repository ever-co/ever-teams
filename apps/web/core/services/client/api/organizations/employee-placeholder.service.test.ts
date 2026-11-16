import { employeePlaceholderService } from './employee-placeholder.service';

const scope = { tenantId: 'tenant-1', organizationId: 'organization-1' };

describe('employeePlaceholderService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('creates a member without an account in the organization and teams it names', async () => {
		const post = jest
			.spyOn(employeePlaceholderService, 'post')
			.mockResolvedValue({ data: { id: 'employee-amina', isPlaceholder: true } } as never);

		const input = { ...scope, firstName: 'Amina', email: 'amina@acme.com', teamIds: ['team-1'] };
		const employee = await employeePlaceholderService.create(input);

		expect(employee).toEqual({ id: 'employee-amina', isPlaceholder: true });
		expect(post).toHaveBeenCalledWith('/employee-placeholder', input, { tenantId: 'tenant-1' });
	});

	it('creates many for an import', async () => {
		const post = jest.spyOn(employeePlaceholderService, 'post').mockResolvedValue({ data: { items: [] } } as never);

		const input = { ...scope, members: [{ firstName: 'Amina' }], teamIds: ['team-1'] };
		await employeePlaceholderService.createBulk(input);

		expect(post).toHaveBeenCalledWith('/employee-placeholder/bulk', input, { tenantId: 'tenant-1' });
	});

	it('sends the claim of one member, its id escaped in the path', async () => {
		const post = jest.spyOn(employeePlaceholderService, 'post').mockResolvedValue({ data: {} } as never);

		const input = { ...scope, email: 'amina@acme.com', callbackUrl: 'https://app.test/auth/accept-invite' };
		await employeePlaceholderService.sendClaim('employee/1', input);

		expect(post).toHaveBeenCalledWith('/employee-placeholder/employee%2F1/claim', input, { tenantId: 'tenant-1' });
	});

	it('reads what a merge would move, the target and the scope in the query', async () => {
		const get = jest
			.spyOn(employeePlaceholderService, 'get')
			.mockResolvedValue({ data: { timeLogs: 3, overlappingTimeLogs: 0 } } as never);

		const preview = await employeePlaceholderService.previewMerge('employee-amina', {
			...scope,
			targetEmployeeId: 'employee-ada'
		});

		expect(preview).toEqual({ timeLogs: 3, overlappingTimeLogs: 0 });
		expect(get).toHaveBeenCalledWith(
			'/employee-placeholder/employee-amina/merge-preview?tenantId=tenant-1&organizationId=organization-1&targetEmployeeId=employee-ada',
			{ tenantId: 'tenant-1' }
		);
	});

	it('merges into the member it names', async () => {
		const post = jest
			.spyOn(employeePlaceholderService, 'post')
			.mockResolvedValue({ data: { targetEmployeeId: 'employee-ada', timeLogs: 3 } } as never);

		const input = { ...scope, targetEmployeeId: 'employee-ada' };
		const result = await employeePlaceholderService.merge('employee-amina', input);

		expect(result).toEqual({ targetEmployeeId: 'employee-ada', timeLogs: 3 });
		expect(post).toHaveBeenCalledWith('/employee-placeholder/employee-amina/merge', input, {
			tenantId: 'tenant-1'
		});
	});
});
