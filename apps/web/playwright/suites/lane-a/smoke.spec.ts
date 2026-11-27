import { expect, test } from '../../fixtures';
import { mockRequestsWhen } from '../../helpers';

/**
 * The lane plumbing, proved before anything else is built on it.
 *
 * A lane is an app process, a mock, a statistics sink, a control API and a build directory of its own, started from
 * `E2E_LANE` (test-servers.ts). Each part can fail on its own and each failure looks like an app bug: a dev server
 * that did not take the lane's port, a mock the lane's browser is refused by (`mock-gauzy-server.mjs` trusts only
 * the origins its launcher named), a control API the helpers cannot reach, a fixture the spec was not given. So this
 * file checks the four of them in four lines each, and it is the first thing a lane runs.
 *
 * It is not a test of the app. Nothing here should ever be made longer.
 */

test.describe('the lane has its own servers', () => {
	test('the signed-in shell renders, and the mock that answered is this lane’s', async ({ app, mock }) => {
		const page = await app('/team/tasks');
		// The same contract `suites/mock/shell.spec.ts` pins for the canonical run: the team task list loaded, which
		// only happens if the browser reached *a* Gauzy API and that API answered it. The lane's own mock is the only
		// one its app is configured to talk to, so the log below is the proof of both halves — the app on the lane's
		// port, and the mock accepting the lane's browser origin (`mock-gauzy-server.mjs` answers 403 otherwise).
		await mockRequestsWhen((log) => log.some((request) => request.path === '/api/tasks/team'));
		await expect(page, 'the lane’s app did not take the signed-in person to the team task list').toHaveURL(
			/\/team\/tasks/
		);

		const requests = await mock.requests();
		expect(
			requests.some((request) => request.status < 400),
			`the lane’s mock was asked nothing it accepted (${JSON.stringify(
				requests.map((request) => `${request.method} ${request.path} ${request.status}`)
			)}) — a 403 from the mock’s own origin guard looks exactly like this`
		).toBe(true);
	});

	test('the control API answers, which is how a spec reaches the mock at all', async ({ mock, fixture }) => {
		const state = await mock.state();
		expect(state, 'the control API gave no state').toBeTruthy();
		expect(fixture.ids.tenantA, 'the fixture the control API serves has no tenant').toBeTruthy();
	});

	test('an app route answers the lane, not the canonical 3030', async ({ request }) => {
		const answer = await request.fetch('/api/auth/refresh', {
			method: 'POST',
			data: {},
			headers: { 'content-type': 'application/json' }
		});
		// 400: no refresh token in the body. The status is the point — it is the app's own handler answering the
		// baseURL this lane was configured with.
		expect(answer.status(), 'the route did not answer the way an unauthenticated refresh answers').toBe(400);
	});
});
