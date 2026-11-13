import type { TTask } from '@/core/types/schemas/task/task.schema';
import { startTaskOf } from './timer-start-task';

const taskOf = (id: string) => ({ id, title: id }) as TTask;

const ACTIVE_TASK = taskOf('task-active');
const PAGE_TASK = taskOf('task-page');
const OTHER_TASK = taskOf('task-other');

describe('startTaskOf', () => {
	it('starts the active task when no task is asked for, away from a task page', () => {
		expect(startTaskOf(undefined, '/', null, ACTIVE_TASK)).toEqual({ pageTask: null, taskToUse: ACTIVE_TASK });
	});

	it('starts the task asked for, away from a task page', () => {
		expect(startTaskOf(OTHER_TASK, '/team/tasks', null, ACTIVE_TASK)).toEqual({
			pageTask: null,
			taskToUse: OTHER_TASK
		});
	});

	it("starts the task page's own task when no task is asked for, and names it as the page's", () => {
		expect(startTaskOf(undefined, '/task/task-page', PAGE_TASK, ACTIVE_TASK)).toEqual({
			pageTask: PAGE_TASK,
			taskToUse: PAGE_TASK
		});
	});

	it("keeps the page's task as the page's when it is the one asked for", () => {
		expect(startTaskOf(PAGE_TASK, '/task/task-page', PAGE_TASK, ACTIVE_TASK)).toEqual({
			pageTask: PAGE_TASK,
			taskToUse: PAGE_TASK
		});
	});

	it("starts another task asked for on a task page without making the page's task the active one", () => {
		expect(startTaskOf(OTHER_TASK, '/task/task-page', PAGE_TASK, ACTIVE_TASK)).toEqual({
			pageTask: null,
			taskToUse: OTHER_TASK
		});
	});

	it('starts the active task on a task page whose task is not loaded yet', () => {
		expect(startTaskOf(undefined, '/task/task-page', null, ACTIVE_TASK)).toEqual({
			pageTask: null,
			taskToUse: ACTIVE_TASK
		});
	});
});
