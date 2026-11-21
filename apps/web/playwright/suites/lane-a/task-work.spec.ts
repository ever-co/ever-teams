import { expect, test } from '../../fixtures';
import type { Locator, Page } from '@playwright/test';

import { APP_ORIGIN, mockStateWhen } from '../../helpers';

/**
 * Task work on the task's own page (`/task/<id>`), proven by what the app wrote to the mock.
 *
 * The mock witnesses a task write and only a task write:
 * `mock-gauzy-server.mjs` sets `mutationProof.updatedTask` when a `PUT`/`PATCH` on `/api/tasks/<id>` reaches it,
 * and `mutationProof.inProgressTaskStatusPreserved` only when that body carries `status: 'in-progress'` with
 * `taskStatusId` equal to the team's own in-progress status record (`ids.inProgressStatus`, the same record
 * `/api/task-statuses` answers). So "the status the person picked is the team's status record, not a word"
 * is a fact about the request the mock received.
 *
 * What the mock cannot answer, and what these tests therefore do not claim: it does not persist a task write.
 * `routeResponse` answers `PUT /api/tasks/<id>` with the fixture task merged with the body, and every later
 * `GET /api/tasks/<id>` with the fixture task as it was. So the proof here is the write the mock recorded and
 * the read that follows it — never "the page now shows the new value", which the mock would answer away.
 *
 * Selector provenance, all from the components that render them:
 *   - the rail is `aside[aria-label="Details"]` and its property rows are `TaskPropertyRow`
 *     (core/components/tasks/detail/task-detail-properties.tsx, core/components/tasks/detail/task-property-row.tsx);
 *   - the status picker is `ActiveTaskStatusDropdown` → `StatusDropdown` → `TaskPropertyMenu`, whose popup is the
 *     `data-dropdown` popover holding `input[aria-label="Change status…"]` and `[role="option"]` rows
 *     (core/components/tasks/task-status.tsx, core/components/tasks/task-property-menu.tsx,
 *     locales/en.json `taskMenus.search.status`);
 *   - the assignee picker is `TaskAssigneesField` with `triggerLabel = t('taskDetail.properties.MANAGE_ASSIGNEES')`
     ("Assign people") and options named by the teammate's name (core/components/tasks/detail/task-assignees-field.tsx);
 *   - the estimate field's trigger `aria-label` is `Estimate: <text>` and its panel holds the preset chips
 *     30m / 1h / 2h / 4h / 8h (core/components/tasks/task-estimate.tsx, rendered by
 *     core/components/tasks/detail/task-detail-time.tsx).
 * The write half of each flow is the same `useUpdateTask` → `taskService.updateTask` → `PUT /api/tasks/<id>`
 * (core/hooks/organizations/teams/use-update-task.ts, core/services/client/api/tasks/task.service.ts).
 */

type TaskMockState = {
	mutationProof: { startedTimer: boolean; updatedTask: boolean; inProgressTaskStatusPreserved: boolean };
	requests: Array<{ method: string; path: string; status: number; startMs: number; endMs: number }>;
};

type BrowserWrite = { method: string; url: string; path: string; body: Record<string, unknown> };

const asJson = (raw: string | null): Record<string, unknown> => {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return { notJson: raw.slice(0, 120) };
	}
};

/** Records the task writes the browser sends, without changing them (`route.fallback()` forwards as usual). */
function recordTaskWrites(page: Page): BrowserWrite[] {
	const writes: BrowserWrite[] = [];
	void page.route(/\/api\/tasks\/[0-9a-f-]+/i, (route) => {
		const request = route.request();
		const method = request.method();
		if (method === 'PUT' || method === 'PATCH') {
			writes.push({ method, url: request.url(), path: new URL(request.url()).pathname, body: asJson(request.postData()) });
		}
		return route.fallback();
	});
	return writes;
}

const summary = (requests: Array<{ method: string; path: string; status: number }>) =>
	JSON.stringify(requests.map((request) => [request.method, request.path, request.status]));

/** The properties rail of the task page: on this viewport (1280 px, the config's Desktop Chrome) the rail holds them. */
async function railOf(page: Page): Promise<Locator> {
	const rail = page.locator('aside[aria-label="Details"]');
	await expect(
		rail,
		'the task page did not open its properties rail, so none of these pickers exist'
	).toBeVisible({ timeout: 20_000 });
	return rail;
}

/** One property row of the rail, found by the label its row renders, then the control inside it. */
function propertyRow(rail: Locator, label: string): Locator {
	return rail.locator('div.grid').filter({ has: rail.locator(`> span > span:text-is("${label}")`) });
}

/** The picker popup `TaskPropertyMenu` opens, recognised by the search field it holds. */
function openMenu(page: Page, searchLabel: string): Locator {
	return page.locator('[data-dropdown]').filter({ has: page.getByRole('combobox', { name: searchLabel }) });
}

const proofOf = async (mock: { state: () => Promise<Record<string, unknown>> }) =>
	(await mock.state()).mutationProof as TaskMockState['mutationProof'];

test.describe('a task edited in its own page', () => {
	test('picking another status writes the team’s own status record', async ({ app, mock, fixture }) => {
		const page = await app(`/task/${fixture.ids.task}`);
		const rail = await railOf(page);
		const writes = recordTaskWrites(page);

		const trigger = propertyRow(rail, 'Status').getByRole('button');
		await expect(trigger, 'the status row of the rail holds exactly one control').toHaveCount(1);
		// The task the mock answers with is 'open' (mock-gauzy-server.mjs statuses[0], the team's default).
		await expect(
			trigger,
			`the status row shows the status the mock answers with (${await trigger.textContent()})`
		).toContainText(/open/i);

		await trigger.click();
		const menu = openMenu(page, 'Change status…');
		await expect(
			menu.getByRole('option'),
			`the status picker did not list the team's statuses (${await menu.getByRole('option').count()})`
		).toHaveCount(2);

		await menu.getByRole('option', { name: /in-progress/i }).click();

		await expect
			.poll(() => writes.length, { message: `the status pick never reached the API (${JSON.stringify(writes)})` })
			.toBe(1);
		const write = writes[0];
		expect(write.method, `the status write is a PUT on the task (${write.method} ${write.path})`).toBe('PUT');
		expect(
			new URL(write.url).origin,
			`the write went to the app's own route handler (${write.url})`
		).toBe(APP_ORIGIN);
		expect(write.path, `the write names the task being edited (${write.path})`).toBe(`/api/tasks/${fixture.ids.task}`);
		expect(write.body.status, `the body carries the status picked (${JSON.stringify(write.body.status)})`).toBe(
			'in-progress'
		);
		expect(
			write.body.taskStatusId,
			`the body carries the team's in-progress status record id, not just the word (${JSON.stringify(
				write.body.taskStatusId
			)})`
		).toBe(fixture.ids.inProgressStatus);

		// The mock's own witness of the same write.
		const state = await mockStateWhen<TaskMockState>((current) => current.mutationProof.updatedTask);
		expect(state.mutationProof.updatedTask, 'the mock witnessed a task write').toBe(true);
		expect(
			state.mutationProof.inProgressTaskStatusPreserved,
			'the mock saw the canonical in-progress status id kept on the write'
		).toBe(true);

		const mockWrites = (await mock.calls(`/api/tasks/${fixture.ids.task}`)).filter(
			(request) => request.method === 'PUT' || request.method === 'PATCH'
		);
		expect(
			mockWrites.map((request) => [request.method, request.path, request.status]),
			'the mock recorded exactly the write it was handed'
		).toEqual([['PUT', `/api/tasks/${fixture.ids.task}`, 200]]);
	});

	test('picking the status the task already has asks the API for nothing', async ({ app, mock, fixture }) => {
		const page = await app(`/task/${fixture.ids.task}`);
		const rail = await railOf(page);
		const writes = recordTaskWrites(page);

		const trigger = propertyRow(rail, 'Status').getByRole('button');
		await expect(trigger).toHaveCount(1);
		await trigger.click();
		const menu = openMenu(page, 'Change status…');
		await menu.getByRole('option', { name: /^open$/i }).click();

		// `handleStatusUpdate` returns without a write when the value is the one the task already holds
		// (core/hooks/organizations/teams/use-update-task.ts: `status !== (task as any)[field]`).
		await page.waitForTimeout(1_500);
		expect(writes, `picking the current status sent a write anyway (${JSON.stringify(writes)})`).toHaveLength(0);

		const proof = await proofOf(mock);
		expect(proof.updatedTask, 'the mock was told nothing about the task').toBe(false);
		expect(
			(await mock.calls(`/api/tasks/${fixture.ids.task}`)).filter((request) => request.method === 'PUT').length,
			'no task write reached the mock'
		).toBe(0);
	});

	test('picking an estimate preset writes it as seconds', async ({ app, mock, fixture }) => {
		const page = await app(`/task/${fixture.ids.task}`);
		const writes = recordTaskWrites(page);

		// The fixture task's estimate is 3600 s, so the field's own label states it.
		const estimateField = page.getByRole('button', { name: /^Estimate: 1h$/i });
		await expect(
			estimateField,
			`the estimate field did not show the 1 h the mock answers with (${await estimateField.count()})`
		).toHaveCount(1);

		await estimateField.click();
		const panel = page.getByRole('button', { name: '2h', exact: true });
		await expect(
			panel,
			'the estimate panel did not offer its duration presets'
		).toBeVisible({ timeout: 10_000 });
		await panel.click();

		await expect
			.poll(() => writes.length, { message: `the estimate never reached the API (${JSON.stringify(writes)})` })
			.toBe(1);
		const write = writes[0];
		expect(write.body.estimate, `2 h was written as 7200 seconds (${JSON.stringify(write.body.estimate)})`).toBe(7200);
		expect(write.body.estimateHours, `the write names the hours typed (${JSON.stringify(write.body.estimateHours)})`).toBe(2);
		expect(
			write.body.estimateMinutes,
			`the write names the minutes typed (${JSON.stringify(write.body.estimateMinutes)})`
		).toBe(0);

		const proof = await proofOf(mock);
		expect(proof.updatedTask, 'the mock witnessed the estimate write').toBe(true);

		// After a successful write the app reads the task and the lists holding it again
		// (core/hooks/organizations/teams/task-update-refresh.ts, and useUpdateTask re-reads the task whose detail
		// is open), so the value just saved is checked against the server rather than kept only in this tab.
		// Note what the mock cannot prove: it answers `GET /api/tasks/<id>` with the fixture task as it was, so the
		// re-read does not show 2 h — the proof here is that the re-read happened, in that order.
		const taskContacts = await mock.calls(`/api/tasks/${fixture.ids.task}`);
		const landedWrites = taskContacts.filter((request) => request.method === 'PUT');
		expect(
			landedWrites.map((request) => [request.method, request.path, request.status]),
			`the write landed on the mock (${summary(landedWrites)})`
		).toEqual([['PUT', `/api/tasks/${fixture.ids.task}`, 200]]);
		const writesEndedAt = Math.max(...landedWrites.map((request) => request.endMs));
		const readsAfterWrite = taskContacts.filter((request) => request.method === 'GET' && request.startMs >= writesEndedAt);
		expect(
			readsAfterWrite.length,
			`the task was read again after the write landed (${summary(taskContacts)})`
		).toBeGreaterThanOrEqual(1);
	});

	test('assigning a teammate writes the task’s members with that teammate’s employee id', async ({
		app,
		mock,
		fixture
	}) => {
		const page = await app(`/task/${fixture.ids.task}`);
		const rail = await railOf(page);
		const writes = recordTaskWrites(page);

		// The fixture task is assigned to the signed-in person only (mock-gauzy-server.mjs task.members).
		const assignTrigger = propertyRow(rail, 'Assignees').getByRole('button', { name: 'Assign people' });
		await expect(assignTrigger, 'the assignees row holds its picker').toHaveCount(1);

		await assignTrigger.click();
		const menu = openMenu(page, 'Find a teammate');
		await expect(
			menu.getByRole('option'),
			`the assignee picker did not list the team's members (${await menu.getByRole('option').count()})`
		).toHaveCount(3);

		await menu.getByRole('option', { name: /Fixture Teammate$/i }).click();

		await expect
			.poll(() => writes.length, { message: `the assignment never reached the API (${JSON.stringify(writes)})` })
			.toBe(1);
		const members = writes[0].body.members;
		expect(Array.isArray(members), `the write carries the task's members (${JSON.stringify(members)})`).toBe(true);
		const memberIds = (members as Array<Record<string, unknown>>).map((member) => member.id);
		expect(
			memberIds,
			`the members written are the teammate's employee id beside the one already assigned (${JSON.stringify(memberIds)})`
		).toEqual(expect.arrayContaining([fixture.ids.employee, fixture.ids.teammateEmployee]));
		const memberUserIds = (members as Array<Record<string, unknown>>).map((member) => member.userId);
		expect(
			memberUserIds,
			`each member written names its user (${JSON.stringify(memberUserIds)})`
		).toEqual(expect.arrayContaining([fixture.ids.user, fixture.ids.teammateUser]));

		const proof = await proofOf(mock);
		expect(proof.updatedTask, 'the mock witnessed the assignment write').toBe(true);
		expect(
			(await mock.calls(`/api/tasks/${fixture.ids.task}`))
				.filter((request) => request.method === 'PUT' || request.method === 'PATCH')
				.map((request) => [request.method, request.path, request.status]),
			'the mock recorded exactly the assignment write it was handed'
		).toEqual([['PUT', `/api/tasks/${fixture.ids.task}`, 200]]);
	});

	test('unassigning a teammate writes the members without them', async ({ app, mock, fixture }) => {
		const page = await app(`/task/${fixture.ids.task}`);
		const rail = await railOf(page);
		const writes = recordTaskWrites(page);

		// The signed-in person is the task's only member, so picking them out of the same menu unassigns them
		// (TaskAssigneesField toggle → unassignMember).
		const assignTrigger = propertyRow(rail, 'Assignees').getByRole('button', { name: 'Assign people' });
		await expect(assignTrigger, 'the assignees row holds its picker').toHaveCount(1);
		await assignTrigger.click();
		const menu = openMenu(page, 'Find a teammate');
		await menu.getByRole('option', { name: /Fixture Manager$/i }).click();

		await expect
			.poll(() => writes.length, { message: `the unassignment never reached the API (${JSON.stringify(writes)})` })
			.toBe(1);
		const members = writes[0].body.members as Array<Record<string, unknown>>;
		expect(
			members.map((member) => member.id),
			`the members written left the unassigned person out (${JSON.stringify(members.map((m) => m.id))})`
		).not.toContain(fixture.ids.employee);
		expect(
			writes[0].path,
			`the unassignment was written to the task being edited (${writes[0].path})`
		).toBe(`/api/tasks/${fixture.ids.task}`);
		expect(writes[0].method, `the unassignment is a PUT on the task (${writes[0].method})`).toBe('PUT');

		const proof = await proofOf(mock);
		expect(proof.updatedTask, 'the mock witnessed the unassignment write').toBe(true);
	});
});
