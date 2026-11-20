import { expect, test, type Page } from '../../fixtures';
import { signInAndVisit } from '../../helpers';

/**
 * Settings › Team › Integrations, the Ever Platform section.
 *
 * What the page shows is decided by what the paired API answers, and both sides are observable here:
 * the browser's own requests (carrying the signed-in person's bearer token or not) and the mock's
 * record of what it answered. `connectHealth` and `statsOperator` are the mock's own switches, so the
 * three cases below are the three shapes the section can take — connected, not connected, and managed
 * by someone else — each proven from the traffic, not from a screenshot.
 *
 * Selector provenance: apps/web/cypress/e2e/ever-platform-section.cy.ts, on the same mock
 * (`ever-platform-section`, `ever-connect-panel`, `ever-connect-integration`, `ever-stats-card`,
 * `ever-stats-toggle`, `ever-stats-managed`). The connection parts need the app to run with
 * NEXT_PUBLIC_EVER_CONNECT_ENABLED=true, which test-servers.ts sets for that reason.
 */

type CapturedCall = { authorization: string | null; status: number };

/** Records each call once the paired API has answered it, so a recorded call always carries its status. */
async function capture(page: Page, path: RegExp, sink: CapturedCall[]): Promise<void> {
	await page.route(path, async (route) => {
		const authorization = route.request().headers()['authorization'] ?? null;
		const response = await route.fetch();
		sink.push({ authorization, status: response.status() });
		await route.fulfill({ response });
	});
}

test.describe('the Ever Platform settings section', () => {
	test("shows the connection parts while the paired API answers health, asked with the person's own token", async ({
		page,
		fixture
	}) => {
		const health: CapturedCall[] = [];
		await capture(page, /\/api\/ever-connect\/health(\?.*)?$/, health);
		await signInAndVisit(page, fixture, '/settings/team/integrations');

		await expect
			.poll(() => health.length, {
				message: 'the integrations page never asked the paired API whether it is reachable'
			})
			.toBeGreaterThan(0);
		expect(health[0].authorization, 'health is asked with the signed-in person, not anonymously').toMatch(
			/^Bearer /
		);
		expect(health[0].status, 'the paired API answered health').toBe(200);

		await expect(page.getByTestId('ever-platform-section')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('ever-connect-panel')).toHaveCount(1);
		await expect(page.getByTestId('ever-connect-integration')).toHaveCount(1);
		await expect(page.getByTestId('ever-stats-toggle')).toHaveCount(1);

		// The settings navigation lists this page; the `#ever-platform` hash is only a legacy link target.
		await expect(page.locator('nav[aria-label="Settings"] a[href$="/settings/team/integrations"]')).toHaveCount(1);
	});

	test('hides the connection parts when the paired API answers no health, and keeps the statistics card', async ({
		page,
		fixture,
		mock
	}) => {
		const health: CapturedCall[] = [];
		await capture(page, /\/api\/ever-connect\/health(\?.*)?$/, health);
		await signInAndVisit(page, fixture, '/settings/team/integrations', { scenario: { connectHealth: false } });

		await expect.poll(() => health.length).toBeGreaterThan(0);
		expect(health[0].status, 'the paired API answered 404').toBe(404);

		await expect(page.getByTestId('ever-platform-section')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('ever-stats-card')).toHaveCount(1);
		await expect(page.getByTestId('ever-connect-panel')).toHaveCount(0);
		await expect(page.getByTestId('ever-connect-not-connected')).toHaveCount(0);

		const reads = await mock.calls('/api/ever-connect/health');
		expect(
			reads.map((read) => read.status),
			'the refusal came from the API, not from the page deciding on its own'
		).toEqual([404]);
	});

	test('shows who manages the statistics — and no switch, no payload — to someone who is not the operator', async ({
		page,
		fixture
	}) => {
		const statuses: CapturedCall[] = [];
		await capture(page, /\/api\/ever-stats\/status(\?.*)?$/, statuses);
		await signInAndVisit(page, fixture, '/settings/team/integrations', {
			scenario: { statsOperator: false, connectHealth: false }
		});

		await expect
			.poll(() => statuses.length, { message: 'the page never asked whether this account is the operator' })
			.toBeGreaterThan(0);
		expect(statuses[0].status, 'the operator routes answer 404 for anyone else').toBe(404);

		await expect(page.getByTestId('ever-stats-managed')).toContainText('Managed by the instance operator', {
			timeout: 20_000
		});
		await expect(page.getByTestId('ever-stats-toggle'), 'no switch for someone who cannot change it').toHaveCount(
			0
		);
		await expect(
			page.getByTestId('ever-stats-card').locator('pre'),
			'no payload dump for someone who cannot change it'
		).toHaveCount(0);
	});
});
