import { organizationTeamEmployeeService } from './team-employee.service';

/**
 * Gauzy answers a member order update with an update result ({ affected, raw, generatedMaps }), not the membership.
 * Its answer was validated as a membership and failed on the missing id, so every saved drop reported an error.
 */
describe('OrganizationTeamEmployeeService.editOrganizationTeamEmployeeOrder', () => {
	afterEach(() => jest.restoreAllMocks());

	it("accepts Gauzy's update result for a saved order", async () => {
		jest.spyOn(organizationTeamEmployeeService, 'put').mockResolvedValue({
			config: {},
			data: { affected: 1, raw: [], generatedMaps: [] },
			headers: {},
			status: 200,
			statusText: 'OK'
		} as never);

		await expect(
			organizationTeamEmployeeService.editOrganizationTeamEmployeeOrder({
				organizationTeamEmployeeId: 'member-1',
				data: { order: 2 }
			})
		).resolves.toEqual({});
	});
});
