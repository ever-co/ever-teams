import { organizationTeamEmployeeService } from './team-employee.service';

/**
 * Gauzy answers a member order update with an update result ({ affected, raw, generatedMaps }), not the membership.
 * Its answer was validated as a membership and failed on the missing id, so every saved drop reported an error.
 */
describe('OrganizationTeamEmployeeService.editOrganizationTeamEmployeeOrder', () => {
	afterEach(() => jest.restoreAllMocks());

	const answer = (data: unknown) => ({ config: {}, data, headers: {}, status: 200, statusText: 'OK' }) as never;

	const saveOrder = () =>
		organizationTeamEmployeeService.editOrganizationTeamEmployeeOrder({
			organizationTeamEmployeeId: 'member-1',
			data: { order: 2 }
		});

	it("accepts Gauzy's update result for a saved order, sent for that member", async () => {
		const put = jest
			.spyOn(organizationTeamEmployeeService, 'put')
			.mockResolvedValue(answer({ affected: 1, raw: [], generatedMaps: [] }));

		await expect(saveOrder()).resolves.toMatchObject({ affected: 1 });

		const [endpoint, body] = put.mock.calls[0];
		expect(endpoint).toContain('member-1');
		expect(body).toMatchObject({ order: 2 });
	});

	const silenceLogger = () => {
		const logger = (organizationTeamEmployeeService as unknown as { logger: { error: () => void } }).logger;
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	};

	it('fails when Gauzy changed no row', async () => {
		silenceLogger();
		jest.spyOn(organizationTeamEmployeeService, 'put').mockResolvedValue(answer({ affected: 0, raw: [] }));

		await expect(saveOrder()).rejects.toThrow('not saved');
	});

	it('fails on an answer that is not an update result', async () => {
		silenceLogger();
		jest.spyOn(organizationTeamEmployeeService, 'put').mockResolvedValue(answer({ affected: 'one' }));

		await expect(saveOrder()).rejects.toThrow();
	});
});
