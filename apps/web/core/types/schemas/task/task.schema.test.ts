/**
 * Regression (2026-08-17, seen on demo): the Gauzy API returns `description: null` for tasks created
 * without one (bare `POST /tasks`, other clients). The team task list is validated STRICTLY
 * (`zodStrictPaginationResponseValidate`), so a single such task made the whole list throw
 * "Tasks validation failed … expected string, received null" and the web showed no tasks at all.
 */
import { EIssueType } from '@/core/types/generics/enums/task';
// This module imports the schema barrel itself, so the barrel still loads before task.schema below.
import { zodStrictPaginationResponseValidate } from '@/core/lib/validation/zod-validators';
// The zod schema modules import each other in a cycle; loading the barrel first (as the app does)
// sets a working evaluation order.
require('@/core/types/schemas');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTaskSchema, taskSchema } = require('./task.schema') as typeof import('./task.schema');

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

/**
 * Regression (#4841): issue types are per-organization rows in Gauzy, so a task can hold Memo (created for
 * every tenant) or a custom type. The strict enum on `issueType` made one such task fail the whole team task
 * list, and creating one failed in direct mode, where the body goes through `createTaskSchema` first.
 */
const customIssueTypes = ['Memo', 'Idea'];
const standardIssueTypes = [EIssueType.BUG, EIssueType.TASK, EIssueType.STORY, EIssueType.EPIC];

// The body TaskService.createTask validates before POST /tasks in direct mode.
const minimalCreateTask = {
	title: 'E2E task',
	description: '',
	status: 'open',
	taskStatusId: 'b5c1d2e3-f4a5-4b6c-8d7e-9f0a1b2c3d4e',
	teams: [{ id: '5d0a6c1e-8b2f-4a3d-9c4e-7f1b2a3c4d5e' }],
	tags: [],
	members: [],
	organizationId: minimalTask.organizationId,
	tenantId: minimalTask.tenantId,
	projectId: null,
	estimate: 0
};

describe('taskSchema issueType (API response shapes)', () => {
	it.each(customIssueTypes)('accepts the issue type %s and keeps it as sent', (issueType) => {
		const result = taskSchema.safeParse({ ...minimalTask, issueType });
		expect(result.success).toBe(true);
		expect(result.data?.issueType).toBe(issueType);
	});

	it('one Memo task no longer fails the whole team task list', () => {
		const memoTask = { ...minimalTask, id: '0c9b7a3e-6d5f-4e2a-9b1c-8d7e6f5a4b3c', issueType: 'Memo' };
		const teamTaskList = { items: [minimalTask, memoTask], total: 2 };
		const validated = zodStrictPaginationResponseValidate(taskSchema, teamTaskList, 'getTasks API response');
		expect(validated.items).toHaveLength(2);
	});

	it.each(standardIssueTypes)('control: still accepts the standard issue type %s', (issueType) => {
		const result = taskSchema.safeParse({ ...minimalTask, issueType });
		expect(result.success).toBe(true);
		expect(result.data?.issueType).toBe(issueType);
	});

	it('control: still accepts a null or missing issue type', () => {
		const withNull = taskSchema.safeParse({ ...minimalTask, issueType: null });
		const withoutIssueType = taskSchema.safeParse(minimalTask);
		expect(withNull.success).toBe(true);
		expect(withoutIssueType.success).toBe(true);
	});

	it('control: still rejects a non-string issue type', () => {
		const result = taskSchema.safeParse({ ...minimalTask, issueType: 42 });
		expect(result.success).toBe(false);
	});
});

describe('createTaskSchema issueType (direct-mode creation body)', () => {
	it.each(customIssueTypes)('accepts the issue type %s', (issueType) => {
		const result = createTaskSchema.safeParse({ ...minimalCreateTask, issueType });
		expect(result.success).toBe(true);
	});

	it.each(standardIssueTypes)('control: still accepts the standard issue type %s', (issueType) => {
		const result = createTaskSchema.safeParse({ ...minimalCreateTask, issueType });
		expect(result.success).toBe(true);
	});

	it('control: still rejects a non-string issue type', () => {
		const result = createTaskSchema.safeParse({ ...minimalCreateTask, issueType: 42 });
		expect(result.success).toBe(false);
	});
});
