import { expect, test } from '../../fixtures';
import { mockStateWhen, statsReports } from '../../helpers';

/**
 * The operator's usage-statistics switch in Settings › Team › Integrations, and the web app's own
 * reporter following it: switched off, no report reaches the Ever Platform mock; switched back on, the
 * next one does.
 *
 * The reporter runs on EVER_STATS_SEND_INTERVAL_S=5 (set in test-servers.ts, honoured only for a local
 * statistics address) and sends to the Ever Platform mock on 127.0.0.1:3989, which checks each report's
 * signature and schema before accepting it. `mock.stats()` is that sink's answer, so "a report
 * arrived" is a fact about the server, not about the page.
 *
 * Provenance: apps/web/cypress/e2e/ever-stats-toggle.cy.ts proves the same controls
 * (`[data-testid="ever-platform-section"]`, `[data-testid="ever-stats-toggle"]`) and the same
 * everPlatform.toggles shape.
 */

const INTERVAL_S = 5;

type PlatformState = {
	scenario: { statsEnabledUi?: boolean };
	everPlatform: { stateReads: number; toggles: Array<{ enabled: boolean; withBearer: boolean; keys: string[] }> };
};

async function reportsAbove(count: number, timeoutMs: number) {
	await expect
		.poll(async () => (await statsReports()).length, {
			message: `no statistics report arrived within ${timeoutMs} ms`,
			timeout: timeoutMs,
			intervals: [1_000]
		})
		.toBeGreaterThan(count);
}

test.describe('the anonymous usage statistics switch', () => {
	test('switching it off stops the reports, and switching it back on resumes them', async ({ app, mock }) => {
		// The case waits out the reporter's interval over and over (a report first, one interval and four more switched
		// off, up to four to resume) on top of a page a dev server may compile on the way: more than the default budget.
		test.slow();

		// The reporter runs in the app's server, started by its instrumentation (instrumentation.ts). As the run's first
		// test, against a `next dev` that had served nothing yet, no report came within 30 s: the page is opened first.
		const page = await app('/settings/team/integrations');
		await reportsAbove(0, 30_000);

		await expect(page.getByTestId('ever-platform-section')).toBeVisible({ timeout: 20_000 });

		const toggle = page.getByTestId('ever-stats-toggle');
		await expect(toggle).toHaveAttribute('aria-checked', 'true');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 });

		const state = await mockStateWhen<PlatformState>((s) => s.scenario.statsEnabledUi === false);
		expect(state.scenario.statsEnabledUi, 'the switch is stored in the paired API').toBe(false);
		expect(
			state.everPlatform.toggles,
			'the switch was set with the operator token and a boolean, and nothing else'
		).toEqual([{ enabled: false, withBearer: true, keys: ['enabled'] }]);

		// A report already on its way when the switch moved may still land: count from an interval later.
		await page.waitForTimeout(INTERVAL_S * 1_000 + 1_000);
		const before = (await mock.stats()).length;

		await page.waitForTimeout(INTERVAL_S * 1_000 * 4);
		expect((await mock.stats()).length, 'nothing new may reach the platform while switched off').toBe(before);

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });
		await reportsAbove(before, INTERVAL_S * 1_000 * 4);

		const writes = await mock.calls('/api/ever-stats/enabled');
		expect(
			writes.map((write) => write.status),
			'every toggle write'
		).toEqual(writes.map(() => 200));
	});

	test('sends nothing while the paired API does not serve this web app', async ({ app, mock }) => {
		await app('/settings/team/integrations', { scenario: { statsPaired: false } });

		await mockStateWhen<PlatformState>((s) => s.everPlatform.stateReads > 0);
		const before = (await mock.stats()).length;
		const readsBefore = (await mock.state()).everPlatform as PlatformState['everPlatform'];

		await new Promise((done) => setTimeout(done, INTERVAL_S * 1_000 * 3));

		const after = (await mock.stats()).length;
		const readsAfter = (await mock.state()).everPlatform as PlatformState['everPlatform'];

		expect(after, 'an unpaired app must not report anything').toBe(before);
		expect(
			readsAfter.stateReads,
			'the reporter stopped asking the paired API: unpaired is indistinguishable from stopped'
		).toBeGreaterThan(readsBefore.stateReads);
	});
});
