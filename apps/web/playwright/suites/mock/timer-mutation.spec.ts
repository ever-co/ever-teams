import { expect, test, type Page } from '../../fixtures';
import {
	hardVisit,
	mockStateWhen,
	signInWithFixture,
	waitForShellReady,
	type BootstrapFixture,
	type MockScenario
} from '../../helpers';

/**
 * Starting the timer, and what a running timer is allowed to change.
 *
 * The mock is the witness: it sets `mutationProof.startedTimer` when a start reached it,
 * `mutationProof.updatedTask` when a task write reached it, and
 * `mutationProof.inProgressTaskStatusPreserved` only when that write kept the canonical `IN_PROGRESS`
 * taskStatusId. So "starting the timer also updated the task, without losing its status" is a fact
 * about the requests the app made, not about a clock on screen.
 *
 * Provenance: apps/web/cypress/e2e/feature-parity.cy.ts proves these scenarios, the
 * `button[aria-label="Start timer"]` control, the three localStorage keys that keep the plan and
 * estimate modals off the timer button, and this same mutationProof shape.
 */

type MutationProof = {
	startedTimer: boolean;
	updatedTask: boolean;
	inProgressTaskStatusPreserved: boolean;
};

type MockState = Record<string, unknown> & { mutationProof: MutationProof };

const proofOf = async (mock: { state: () => Promise<Record<string, unknown>> }) =>
	(await mock.state()).mutationProof as MutationProof;

const startButton = (page: Page) => page.locator('button[aria-label="Start timer"]').first();

/** Records the timer starts, and the task writes a start makes the app send. */
async function recordMutations(page: Page) {
	const starts: Array<Record<string, unknown>> = [];
	const taskWrites: Array<{ method: string; body: Record<string, unknown> }> = [];

	await page.route(/\/api\/(timer|timesheet\/timer)\/start$/, async (route) => {
		starts.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
		return route.fallback();
	});
	await page.route(/\/api\/tasks\/.+$/, async (route) => {
		const method = route.request().method();
		if (method === 'PUT' || method === 'PATCH') {
			taskWrites.push({ method, body: (route.request().postDataJSON() ?? {}) as Record<string, unknown> });
		}
		return route.fallback();
	});

	return { starts, taskWrites };
}

/** Routes first, cookies second, navigation last: what a spec needs when it must see the requests. */
async function signedInOnRoute(
	page: Page,
	mock: { scenario: (scenario: MockScenario) => Promise<void> },
	fixture: BootstrapFixture,
	path: string,
	scenario: MockScenario
): Promise<Page> {
	await mock.scenario(scenario);
	await signInWithFixture(page.context(), fixture, 'A');
	await hardVisit(page, path);
	return page;
}

/** The modals that ask about a plan or an estimate would sit on top of the timer button. */
async function silenceTodaysModals(page: Page): Promise<void> {
	const today = new Date().toISOString().split('T')[0];
	await page.evaluate((date) => {
		window.localStorage.setItem('daily-plan-suggestion-modal-date', date);
		window.localStorage.setItem('tasks-estimate-hours-modal-date', date);
		window.localStorage.setItem('daily-plan-estimate-hours-modal', date);
	}, today);
}

test.describe('starting the timer', () => {
	test('starts it, and the task write that follows keeps the canonical IN_PROGRESS status', async ({
		page,
		fixture,
		mock
	}) => {
		const written = await recordMutations(page);
		await signedInOnRoute(page, mock, fixture, '/team/tasks', { hasPlan: true, requirePlanToTrack: false });
		await silenceTodaysModals(page);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		const state = await mockStateWhen<MockState>(
			(current) => current.mutationProof.startedTimer && current.mutationProof.updatedTask
		);
		expect(state.mutationProof, 'the whole chain the mock witnesses').toEqual({
			startedTimer: true,
			updatedTask: true,
			inProgressTaskStatusPreserved: true
		});

		expect(written.starts, 'the start reached the API').toHaveLength(1);
		expect(
			written.taskWrites,
			'the task update reached the API as a PUT or PATCH on the task'
		).not.toHaveLength(0);
	});

	test('starts at once when the team leaves planning to its members', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		await mockStateWhen<MockState>((state) => state.mutationProof.startedTimer);
		await expect(page.getByText('Create a plan for today'), 'no plan was asked for').toHaveCount(0);
	});

	test('starts on the task the task bar shows when no task was chosen on this device', async ({
		page,
		fixture,
		mock
	}) => {
		const written = await recordMutations(page);
		await signedInOnRoute(page, mock, fixture, '/', { hasPlan: false, requirePlanToTrack: false });

		// The fixture signs in with a task already chosen; this case is the device that never chose one.
		await page.evaluate(() => {
			document.cookie = 'auth-active-task=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		});
		await hardVisit(page, '/');

		await expect(page.getByText(fixture.names.task)).toBeVisible({ timeout: 20_000 });
		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		await expect.poll(() => written.starts.length, { message: 'the start never reached the API' }).toBe(1);
		expect(written.starts[0].taskId, 'the start names the task the bar was showing').toBe(fixture.ids.task);
	});

	test('blocks the timer only when the team requires a plan the person does not have', async ({ app, mock }) => {
		const page = await app('/team/tasks', { scenario: { hasPlan: false, requirePlanToTrack: true } });

		await expect(startButton(page)).toBeVisible({ timeout: 20_000 });
		await startButton(page).click({ force: true });
		await page.waitForTimeout(250);

		expect((await proofOf(mock)).startedTimer, 'a missing plan must not let a timer start').toBe(false);
	});

	test('a slow first workspace cannot overwrite the workspace signed into meanwhile', async ({
		page,
		fixture,
		mock
	}) => {
		await mock.scenario({ requirePlanToTrack: true, delays: { [`${fixture.ids.tenantA}:/api/daily-plan`]: 900 } });
		await signInWithFixture(page.context(), fixture, 'A');
		await hardVisit(page, '/team/tasks');

		// Workspace B is opened while tenant A's plan read is still on its way.
		await signInWithFixture(page.context(), fixture, 'B');
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);

		await expect(page.getByText(fixture.names.teamB)).toBeVisible({ timeout: 15_000 });
		await page.waitForTimeout(1_000);
		await expect(page.getByText(fixture.names.teamB), 'the delayed answer of the workspace left behind').toBeVisible();

		const teamPlans = (await mock.requests()).filter((request) => request.path.startsWith('/api/daily-plan'));
		const lastScope = new URLSearchParams(teamPlans.at(-1)?.query ?? '').get('where[tenantId]');
		expect(lastScope, 'the last plan read is scoped to the workspace now open').toBe(fixture.ids.tenantB);
	});
});
