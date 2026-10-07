/**
 * Regression (2026-08-17, seen on demo): the Gauzy API returns `description: null` for tasks created
 * without one (bare `POST /tasks`, other clients). The team task list is validated STRICTLY
 * (`zodStrictPaginationResponseValidate`), so a single such task made the whole list throw
 * "Tasks validation failed … expected string, received null" and the web showed no tasks at all.
 */
// The zod schema modules import each other in a cycle; loading the barrel first (as the app does)
// sets a working evaluation order.
require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { taskSchema } = require('./task.schema') as typeof import('./task.schema');

const minimalTask = {
	id: '938816fb-9f91-425a-893a-63468dade965',
	title: 'E2E task',
	public: true,
	tenantId: 'ec3b6673-d045-4d59-a307-a79521500a81',
	organizationId: '06dea660-2426-4c79-a5aa-05f3434287d9',
	status: 'open',
	estimate: 0,
	tags: [],
	teams: [],
	members: []
};

describe('taskSchema (API response shapes)', () => {
	it('accepts description: null (API default for tasks created without a description)', () => {
		const r = taskSchema.safeParse({ ...minimalTask, description: null });
		expect(r.success).toBe(true);
	});

	it('still accepts a string description and a missing one', () => {
		expect(taskSchema.safeParse({ ...minimalTask, description: 'hello' }).success).toBe(true);
		expect(taskSchema.safeParse(minimalTask).success).toBe(true);
	});

	it('control: still rejects a non-string description', () => {
		expect(taskSchema.safeParse({ ...minimalTask, description: 42 }).success).toBe(false);
	});
});
