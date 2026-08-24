import { employeeService } from './employee.service';

describe('EmployeeService scoped team filtering', () => {
	afterEach(() => jest.restoreAllMocks());

	it('keeps the explicit team filter when a captured scope has no team yet', async () => {
		const get = jest.spyOn(employeeService, 'get').mockResolvedValue({
			config: {},
			data: { items: [], total: 0 },
			headers: {},
			status: 200,
			statusText: 'OK'
		} as never);
		const signal = new AbortController().signal;

		await employeeService.getWorkingEmployees('team-argument', {
			scope: {
				tenantId: 'tenant-1',
				organizationId: 'organization-1',
				teamId: undefined,
				accessToken: 'token-1'
			},
			signal
		});

		const [url, config] = get.mock.calls[0];
		const parsed = new URL(url, 'https://client.test');
		expect(parsed.searchParams.get('organizationTeamId')).toBe('team-argument');
		expect(parsed.searchParams.get('organizationId')).toBe('organization-1');
		expect(config).toMatchObject({ tenantId: 'tenant-1', signal });
	});
});
