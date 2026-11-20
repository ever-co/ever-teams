import { expect, test } from '../../fixtures';
import { hardVisit, mockRequests, mockRequestsWhen, type StubRequest } from '../../helpers';

/**
 * Who may read whose work profile.
 *
 * `/api/timesheet/statistics/profile-activity` is the read that answers a profile page, and the mock
 * records every call it answered with its query. That makes the four access rules of a profile
 * provable as facts about the API traffic: a self, a manager, a teammate who shares their profile and
 * a teammate who does not — the last one must cause no read at all, not a read that the page then
 * hides.
 *
 * Provenance: apps/web/cypress/e2e/profile-activity.cy.ts, on the same mock and the same fixture ids.
 * The read arrives after the shell is ready, so it is waited for rather than assumed (the Cypress
 * spec's fixed 200 ms wait lost it on a busy runner).
 */

const PROFILE_PATH = '/api/timesheet/statistics/profile-activity';

const profileReads = (requests: StubRequest[]) => requests.filter((request) => request.path === PROFILE_PATH);
const employeeOf = (request: StubRequest) => new URLSearchParams(request.query).get('employeeId');

test.describe('employee-scoped profile activity', () => {
	test('a member reading their own profile needs no manager rights', async ({ app, fixture }) => {
		await app(`/profile/${fixture.ids.user}`, { scenario: { manager: false } });

		const requests = await mockRequestsWhen((calls) => profileReads(calls).length >= 1);
		expect(profileReads(requests), 'their own profile was read').toHaveLength(1);
		expect(employeeOf(profileReads(requests)[0]), 'and it was read as themselves').toBe(fixture.ids.employee);
	});

	test('a manager reads a teammate profile', async ({ app, fixture }) => {
		await app(`/profile/${fixture.ids.teammateUser}`, { scenario: { manager: true } });

		const requests = await mockRequestsWhen((calls) => profileReads(calls).length >= 1);
		expect(employeeOf(profileReads(requests)[0]), 'the manager was shown the teammate day').toBe(
			fixture.ids.teammateEmployee
		);
	});

	test('a teammate who shares their profile is readable by another member', async ({ app, fixture }) => {
		await app(`/profile/${fixture.ids.teammateUser}`, { scenario: { manager: false, shareProfileView: true } });

		const requests = await mockRequestsWhen((calls) => profileReads(calls).length >= 1);
		expect(employeeOf(profileReads(requests)[0]), 'the share is what opened the profile').toBe(
			fixture.ids.teammateEmployee
		);
	});

	test('a teammate who does not share their profile causes no read at all', async ({ app, fixture, mock }) => {
		const page = await app(`/profile/${fixture.ids.deniedUser}`, {
			scenario: { manager: false, shareProfileView: false }
		});

		// Nothing may be read: give the page the time a read would have taken, then look at the log.
		await page.waitForTimeout(1_000);
		const requests = await mock.requests();
		expect(
			profileReads(requests).map((request) => `${request.method} ${request.path}`),
			'a profile that is not shared must not be asked for'
		).toEqual([]);
	});

	test('mounting Stats adds one month summary and one selected-year lightweight read, and no more', async ({
		app,
		fixture
	}) => {
		const page = await app(`/profile/${fixture.ids.teammateUser}`, {
			scenario: { manager: false, shareProfileView: true }
		});

		// The profile's tabs are tabs, Stats among them (core/components/pages/profile/task-filters.tsx, the tab list of
		// core/hooks/tasks/use-task-filter.ts); its count chip follows the name.
		await page.getByRole('tab', { name: /^stats/i }).click();

		await mockRequestsWhen((calls) => profileReads(calls).length >= 2);
		// Give a third read the time it would take, then count from the log as it is after that wait.
		await page.waitForTimeout(300);

		const reads = profileReads(await mockRequests());
		expect(reads, 'a third profile read is the regression this guards').toHaveLength(2);
		expect(
			reads.filter((request) => new URLSearchParams(request.query).get('includeDaily') === 'false').length,
			'exactly one read is the month summary'
		).toBe(1);
		expect(
			reads.filter((request) => new URLSearchParams(request.query).get('includeDaily') === 'true').length,
			'exactly one read is the selected year'
		).toBe(1);
		expect(reads.map(employeeOf), 'both reads stay scoped to the profile being looked at').toEqual([
			fixture.ids.teammateEmployee,
			fixture.ids.teammateEmployee
		]);
	});

	test('two profiles opened one after the other keep their own request scopes', async ({ app, fixture }) => {
		const page = await app(`/profile/${fixture.ids.teammateUser}`, { scenario: { manager: true } });
		await mockRequestsWhen((calls) => profileReads(calls).length >= 1, { tries: 20 });

		await hardVisit(page, `/profile/${fixture.ids.deniedUser}`);
		const requests = await mockRequestsWhen((calls) => profileReads(calls).length >= 2);

		expect(
			[...new Set(profileReads(requests).map(employeeOf))].sort(),
			'each profile was read as itself; a shared token would show up here as one employee or none'
		).toEqual([fixture.ids.deniedEmployee, fixture.ids.teammateEmployee].sort());
	});
});
