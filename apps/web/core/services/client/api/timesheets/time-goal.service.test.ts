/**
 * The time goals client: every read and write names the organization (the platform refuses one that does not), and
 * a goal's id stays one path segment.
 */
import { timeGoalService } from './time-goal.service';
import { ETimeGoalComparison, ETimeGoalPeriod, ETimeGoalScope } from '@/core/types/interfaces/timesheet/time-goal';

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => 'org-1',
	getTenantIdCookie: () => 'tenant-1'
}));

function queryOf(url: string) {
	return new URL(url, 'https://client.test').searchParams;
}

function pathOf(url: string) {
	return new URL(url, 'https://client.test').pathname;
}

afterEach(() => jest.restoreAllMocks());

describe('timeGoalService', () => {
	it('lists the goals of the organization, archived ones when asked', async () => {
		const get = jest.spyOn(timeGoalService, 'get').mockResolvedValue({ data: { items: [], total: 0 } } as never);

		await timeGoalService.list({ includeArchived: true });

		const [url] = get.mock.calls[0];
		expect(pathOf(url)).toBe('/time-goals');
		expect(queryOf(url).get('organizationId')).toBe('org-1');
		expect(queryOf(url).get('tenantId')).toBe('tenant-1');
		expect(queryOf(url).get('includeArchived')).toBe('true');
	});

	it('reads the progress of the caller, or of the members of a team', async () => {
		const get = jest.spyOn(timeGoalService, 'get').mockResolvedValue({ data: [] } as never);

		await timeGoalService.progress();
		await timeGoalService.progress({ organizationTeamId: 'team-1' });

		const [ownUrl] = get.mock.calls[0];
		const [teamUrl] = get.mock.calls[1];
		expect(pathOf(ownUrl)).toBe('/time-goals/progress');
		expect(queryOf(ownUrl).get('organizationId')).toBe('org-1');
		expect(queryOf(ownUrl).has('organizationTeamId')).toBe(false);
		expect(queryOf(teamUrl).get('organizationTeamId')).toBe('team-1');
	});

	it('creates a goal in the organization', async () => {
		const post = jest.spyOn(timeGoalService, 'post').mockResolvedValue({ data: { id: 'goal-1' } } as never);
		const input = {
			name: 'Client A',
			comparison: ETimeGoalComparison.AT_LEAST,
			targetHours: 20,
			period: ETimeGoalPeriod.WEEK,
			scope: ETimeGoalScope.EMPLOYEE,
			organizationContactIds: ['client-a']
		};

		await timeGoalService.create(input);

		expect(post).toHaveBeenCalledWith('/time-goals', { ...input, organizationId: 'org-1', tenantId: 'tenant-1' });
	});

	it('changes, archives and restores a goal by its encoded id, in the organization', async () => {
		const put = jest.spyOn(timeGoalService, 'put').mockResolvedValue({ data: { id: 'goal-1' } } as never);

		await timeGoalService.update('goal/1', { targetHours: 15 });
		await timeGoalService.archive('goal-1');
		await timeGoalService.restore('goal-1');

		const scope = { organizationId: 'org-1', tenantId: 'tenant-1' };
		expect(put).toHaveBeenNthCalledWith(1, '/time-goals/goal%2F1', { targetHours: 15, ...scope });
		expect(put).toHaveBeenNthCalledWith(2, '/time-goals/goal-1/archive', scope);
		expect(put).toHaveBeenNthCalledWith(3, '/time-goals/goal-1/restore', scope);
	});
});
