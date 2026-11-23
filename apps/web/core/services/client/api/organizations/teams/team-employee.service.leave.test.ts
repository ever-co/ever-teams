import { organizationTeamEmployeeService } from './team-employee.service';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-payments',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));

/**
 * The API removes a plain member from the team the request names, whatever the id in the path. Named after the
 * active-team cookie, which every tab shares, a Leave took the person out of the team another tab had open (#5737).
 */
describe('OrganizationTeamEmployeeService.deleteOrganizationTeamEmployee', () => {
	afterEach(() => jest.restoreAllMocks());

	const deleted = { config: {}, data: { affected: 1, raw: [] }, headers: {}, status: 200, statusText: 'OK' } as never;

	function teamNamedIn(endpoint: string) {
		const url = new URL(endpoint, 'https://api.example.com');
		return url.searchParams.get('organizationTeamId');
	}

	it('names the team of the membership it deletes, with the active-team cookie on another team', async () => {
		const remove = jest.spyOn(organizationTeamEmployeeService, 'delete').mockResolvedValue(deleted);

		await organizationTeamEmployeeService.deleteOrganizationTeamEmployee({
			organizationTeamEmployeeId: 'membership-design-ops',
			employeeId: 'employee-1',
			organizationTeamId: 'team-design-ops'
		});

		const [endpoint] = remove.mock.calls[0];
		expect(endpoint).toContain('/organization-team-employee/membership-design-ops?');
		expect(teamNamedIn(endpoint)).toBe('team-design-ops');
	});

	it('keeps the active team for a caller that names none', async () => {
		const remove = jest.spyOn(organizationTeamEmployeeService, 'delete').mockResolvedValue(deleted);

		await organizationTeamEmployeeService.deleteOrganizationTeamEmployee({
			organizationTeamEmployeeId: 'membership-payments',
			employeeId: 'employee-1'
		});

		const [endpoint] = remove.mock.calls[0];
		expect(teamNamedIn(endpoint)).toBe('team-payments');
	});
});
